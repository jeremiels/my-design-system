// The Custom Elements Manifest is the public API (ADR 0001, D3/D5): check it
// against the rendered components, so the docs can't announce parts, slots,
// tokens or attributes that don't exist — or miss tokens that do.
import { describe, expect, it } from "vitest";
import manifest from "../custom-elements.json";
import type { DSBaseElement } from "./components/base-element.js";
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

function tokensDeclaredOnHost(root: ShadowRoot): string[] {
  const tokens = new Set<string>();
  for (const sheet of root.adoptedStyleSheets) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ":host") {
        for (const property of Array.from(rule.style)) {
          if (property.startsWith("--u-")) {
            tokens.add(property);
          }
        }
      }
    }
  }
  return [...tokens].sort();
}

async function render(tag: string): Promise<DSBaseElement> {
  const element = document.createElement(tag) as DSBaseElement;
  document.body.append(element);
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
    const root = (await render(tag)).shadowRoot!;
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

  it("observes every documented attribute", () => {
    const observed = (customElements.get(tag) as unknown as typeof DSBaseElement)
      .observedAttributes;
    for (const { name } of declaration.attributes ?? []) {
      expect(observed, `attribute "${name}"`).toContain(name.toLowerCase());
    }
  });
});
