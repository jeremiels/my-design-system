// The Custom Elements Manifest is the public API (ADR 0001, D3/D5): check it
// against the rendered components, so the docs can't announce parts, slots,
// tokens or attributes that don't exist — or miss tokens that do.
import { describe, expect, it } from "vitest";
import manifest from "../custom-elements.json";
import type { DSBaseElement } from "./bases/base-element.js";
import "./define.js";
import { allComponents } from "./registry/catalog.js";

interface Named {
  name: string;
}
interface Declaration {
  name: string;
  tagName?: string;
  customElement?: boolean;
  attributes?: Named[];
  slots?: Named[];
  cssParts?: Named[];
  cssProperties?: Named[];
}

const components = (manifest.modules as { declarations?: Declaration[] }[])
  .flatMap((module) => module.declarations ?? [])
  .filter((declaration) => declaration.customElement && declaration.tagName);

/** Every style rule of the shadow root's sheets, those in `@media` & co. included. */
function styleRules(root: ShadowRoot): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];
  const collect = (list: CSSRuleList) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSStyleRule) {
        rules.push(rule);
      }
      if ("cssRules" in rule) {
        collect((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of root.adoptedStyleSheets) {
    collect(sheet.cssRules);
  }
  return rules;
}

function tokensDeclaredOnHost(root: ShadowRoot): string[] {
  const tokens = new Set<string>();
  for (const rule of styleRules(root)) {
    if (rule.selectorText === ":host") {
      for (const property of Array.from(rule.style)) {
        if (property.startsWith("--u-")) {
          tokens.add(property);
        }
      }
    }
  }
  return [...tokens].sort();
}

/** `:host` or `:host(…)`, alone: a rule that only matches the host itself. */
const HOST_ONLY = /^:host(?:\((?:[^()]|\([^()]*\))*\))?$/;
const isHostOnly = (selectorText: string) =>
  selectorText.split(/,\s*(?![^()]*\))/).every((selector) => HOST_ONLY.test(selector));

/** The host attribute states the sheets style, e.g. `["variant", "secondary"]`. */
function hostAttributeStates(root: ShadowRoot): [string, string][] {
  const states = new Map<string, [string, string]>();
  for (const rule of styleRules(root)) {
    for (const [, name, value = ""] of rule.selectorText.matchAll(
      /:host\(\[([\w-]+)(?:="([^"]*)")?\]\)/g,
    )) {
      states.set(`${name}=${value}`, [name, value]);
    }
  }
  return [...states.values()];
}

/** Attributes some parts need to render: the `gap` of `pagination`, with enough pages. */
const attributesFor: Record<string, Record<string, string>> = {
  "u-pagination": { pages: "20" },
};

/** What some parts need besides: a message of `toaster`, tabs past the edge of `tabs`. */
const setupFor: Record<string, (element: HTMLElement) => Promise<void> | void> = {
  "u-toaster": (element) =>
    (element as unknown as { show(message: string, options: object): void }).show("Saved", {
      duration: 0,
    }),
  "u-tabs": async (element) => {
    element.style.inlineSize = "8rem";
    element.innerHTML = Array.from(
      { length: 8 },
      (_, index) => `<u-tab value="${index}">Tab ${index}</u-tab>`,
    ).join("");
    // The list measures itself after a render, then shows its buttons.
    for (let render = 0; render < 3; render++) {
      await (element as DSBaseElement).updateComplete;
      await new Promise(requestAnimationFrame);
    }
  },
};

async function render(tag: string, content = ""): Promise<DSBaseElement> {
  const element = document.createElement(tag) as DSBaseElement;
  for (const [name, value] of Object.entries(attributesFor[tag] ?? {})) {
    element.setAttribute(name, value);
  }
  element.innerHTML = content;
  document.body.append(element);
  await element.updateComplete;
  await setupFor[tag]?.(element);
  await element.updateComplete;
  return element;
}

it("documents exactly the components of the catalog", () => {
  // Fails when a component misses its @element JSDoc or its allComponents entry.
  expect(components.map((declaration) => declaration.tagName).sort()).toEqual(
    allComponents.map(({ componentName }) => `u-${componentName}`).sort(),
  );
});

describe.each(components)("<$tagName> matches the manifest", (declaration) => {
  const tag = declaration.tagName!;

  it("exposes every documented part", async () => {
    // Some parts need content: an `option` part, a suggestion of
    // `autocomplete`, renders only with an `<option>` child.
    const content = declaration.slots?.some(({ name }) => !name) ? "<option>Option</option>" : "";
    const root = (await render(tag, content)).shadowRoot!;
    for (const { name } of declaration.cssParts ?? []) {
      expect(root.querySelector(`[part~="${name}"]`), `part "${name}"`).not.toBeNull();
    }
  });

  it("renders every documented slot", async () => {
    const root = (await render(tag)).shadowRoot!;
    for (const { name } of declaration.slots ?? []) {
      const selector = name ? `slot[name="${name}"]` : "slot:not([name])";
      expect(root.querySelector(selector), `slot "${name}"`).not.toBeNull();
    }
  });

  it("documents exactly the tokens it declares on :host", async () => {
    const root = (await render(tag)).shadowRoot!;
    const documented = (declaration.cssProperties ?? []).map(({ name }) => name).sort();
    expect(documented).toEqual(tokensDeclaredOnHost(root));
  });

  // A documented token is a default the application overrides from outside
  // the shadow root. Redeclared on an inner element (e.g. a variant's
  // modifier class), it would override the application's value instead;
  // on `:host(…)`, the application's styles still win.
  it("declares its documented tokens on the host only", async () => {
    const root = (await render(tag)).shadowRoot!;
    const documented = new Set((declaration.cssProperties ?? []).map(({ name }) => name));
    const offending = styleRules(root)
      .filter((rule) => !isHostOnly(rule.selectorText))
      .flatMap((rule) =>
        Array.from(rule.style)
          .filter((property) => documented.has(property))
          .map((property) => `${rule.selectorText} { ${property} }`),
      );
    expect(offending).toEqual([]);
  });

  it("applies the application's value of every documented token, in every host state", async () => {
    const tokens = (declaration.cssProperties ?? []).map(({ name }) => name);
    const probe = await render(tag);
    const states = hostAttributeStates(probe.shadowRoot!);
    probe.remove();

    for (const [name, value] of [["", ""], ...states]) {
      const element = document.createElement(tag) as DSBaseElement;
      if (name) {
        element.setAttribute(name, value);
      }
      for (const token of tokens) {
        element.style.setProperty(token, "app-value");
      }
      document.body.append(element);
      await element.updateComplete;
      for (const inner of Array.from(element.shadowRoot!.querySelectorAll("*"))) {
        for (const token of tokens) {
          expect(
            getComputedStyle(inner).getPropertyValue(token).trim(),
            `${token} on <${inner.localName}>${name ? ` with [${name}="${value}"]` : ""}`,
          ).toBe("app-value");
        }
      }
      element.remove();
    }
  });

  it("observes every documented attribute", () => {
    const observed = (customElements.get(tag) as unknown as typeof DSBaseElement)
      .observedAttributes;
    for (const { name } of declaration.attributes ?? []) {
      expect(observed, `attribute "${name}"`).toContain(name.toLowerCase());
    }
  });
});
