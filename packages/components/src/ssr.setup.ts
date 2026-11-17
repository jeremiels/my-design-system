// The server's part of the rendering contract (ADR 0014, D2): runs in Node,
// before the tests of the `ssr` project. Importing the catalog here proves
// that the base loads without DOM; rendering it gives the browsers the pages
// they hydrate (src/ssr.test.ts).
import type { TestProject } from "vitest/node";

/** A page per component of the catalog: what it needs to render, a label, some content. */
const pages: Record<string, string> = {
  button: `<u-button variant="danger">Send</u-button>`,
  "button-link": `<u-button-link href="/next">Next</u-button-link>`,
  alert: `<u-alert type="success">Saved</u-alert>`,
  modal: `<u-modal label="Delivery">Content</u-modal>`,
  icon: `<u-icon name="close" label="Close"></u-icon>`,
  "text-field": `<u-text-field label="Name" hint="As on your card" required></u-text-field>`,
  textarea: `<u-textarea label="Message"></u-textarea>`,
  autocomplete: `<u-autocomplete label="City"><option>Paris</option><option>Pau</option></u-autocomplete>`,
};

export default async function setup(project: TestProject): Promise<void> {
  // First: it installs the DOM the components need on a server.
  const { render } = await import("@lit-labs/ssr");
  const { collectResult } = await import("@lit-labs/ssr/lib/render-result.js");
  const { html, unsafeStatic } = await import("lit/static-html.js");
  const { allComponents } = await import("./registry/catalog.js");
  await import("./define.js");

  const missing = allComponents
    .map(({ componentName }) => componentName)
    .filter((name) => !(name in pages));
  if (missing.length > 0) {
    throw new Error(`src/ssr.setup.ts: add a page for ${missing.join(", ")}.`);
  }
  const rendered: Record<string, string> = {};
  for (const [name, markup] of Object.entries(pages)) {
    rendered[name] = await collectResult(render(html`${unsafeStatic(markup)}`));
  }
  project.provide("serverRendered", rendered);
}

declare module "vitest" {
  export interface ProvidedContext {
    /** Component name → its page, as Lit SSR renders it. */
    serverRendered: Record<string, string>;
  }
}
