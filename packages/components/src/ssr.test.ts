// The browser's part of the rendering contract (ADR 0014, D2): each component
// of the catalog, rendered on a server by src/ssr.setup.ts, has its content
// before any script, and hydrates without error. Chromium, Firefox and WebKit.
//
// First import: Lit reads the hydration support when its own module loads.
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";
import { afterEach, describe, expect, inject, it } from "vitest";
import type { DSBaseElement } from "./bases/base-element.js";
import "./define.js";
import close from "@unicorne/icons/close";
import { Icon } from "./components/icon/icon.js";
import { allComponents } from "./registry/catalog.js";
import { defineComponents } from "./registry/define-components.js";

// The icons of the base as markup: the set src/ssr.setup.ts renders.
class MarkupIcon extends Icon {
  static override icons = { close };
}
defineComponents({ prefix: "ssrmarkup", components: [MarkupIcon] });

const pages = inject("serverRendered");

/** What the page reports while a component hydrates. */
const errors: string[] = [];
addEventListener("error", (event) => errors.push(String(event.message)));
addEventListener("unhandledrejection", (event) => {
  // Reported here: not twice, by the test runner too.
  event.preventDefault();
  errors.push(String(event.reason));
});

/** The page of `name`, parsed as a browser parses a response: its shadow roots are declarative. */
function parse(name: string): DSBaseElement {
  return Document.parseHTMLUnsafe(pages[name]!).body.firstElementChild as DSBaseElement;
}

/** Puts `element` in the page: it upgrades there, and hydrates. */
async function hydrate(element: DSBaseElement): Promise<void> {
  document.body.append(element);
  await element.updateComplete;
  // A rejection of the hydration reaches the page in a later task.
  await new Promise((resolve) => setTimeout(resolve));
  await element.updateComplete;
}

afterEach(() => {
  errors.length = 0;
  document.body.replaceChildren();
});

describe.each(allComponents.map(({ componentName }) => componentName))(
  "<u-%s>, rendered on a server",
  (name) => {
    it("has its shadow root and its styles before any script", () => {
      const element = parse(name);
      expect(element.localName).toBe(`u-${name}`);
      expect(element.shadowRoot, "a declarative shadow root").not.toBeNull();
      expect(element.shadowRoot!.querySelector("style")?.textContent).toContain(":host");
    });

    it("hydrates without error", async () => {
      const element = parse(name);
      const rendered = element.shadowRoot!.firstElementChild;

      await hydrate(element);

      expect(errors).toEqual([]);
      // Hydrated, not rendered again: the server's elements are still there.
      expect(element.shadowRoot!.contains(rendered)).toBe(true);
    });
  },
);

it("shows the message of an alert without script", () => {
  const box = parse("alert").shadowRoot!.querySelector('[part~="alert"]')!;
  expect(box.classList.contains("alert--pending")).toBe(false);
});

it("keeps the message of an alert visible while it hydrates", async () => {
  const alert = parse("alert");
  await hydrate(alert);
  const box = alert.shadowRoot!.querySelector('[part~="alert"]')!;
  expect(getComputedStyle(box).opacity).toBe("1");
});

it("lists the <option> children of an autocomplete once it has hydrated", async () => {
  const field = parse("autocomplete");
  // The server has no children to read: its list is empty.
  expect(field.shadowRoot!.querySelectorAll('[role="option"]')).toHaveLength(0);

  await hydrate(field);

  const options = Array.from(field.shadowRoot!.querySelectorAll('[role="option"]'), (option) =>
    option.textContent!.trim(),
  );
  expect(options).toEqual(["Paris", "Pau"]);
});

it("renders the components a component renders, with their own shadow roots", () => {
  const modal = parse("modal");
  const button = modal.shadowRoot!.querySelector("u-button")!;
  expect(button.shadowRoot!.querySelector("button")).not.toBeNull();
  expect(button.querySelector("u-icon")!.shadowRoot).not.toBeNull();
});

it("renders an icon given as markup on the server, and hydrates it", async () => {
  const icon = parse("icon-markup");
  const svg = icon.shadowRoot!.querySelector("svg");
  expect(svg, "the <svg> before any script").not.toBeNull();

  await hydrate(icon);

  expect(errors).toEqual([]);
  expect(icon.shadowRoot!.querySelector("svg")).toBe(svg);
});
