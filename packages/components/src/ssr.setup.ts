// The server's part of the rendering contract (ADR 0014, D2): runs in Node,
// before the tests of the `ssr` project. Importing the catalog here proves
// that the base loads without DOM; rendering it gives the browsers the pages
// they hydrate (src/ssr.test.ts).
import type { TestProject } from "vitest/node";

/** A page per component of the catalog: what it needs to render, a label, some content. */
const pages: Record<string, string> = {
  button: `<u-button variant="danger">Send</u-button>`,
  "button-link": `<u-button-link href="/next">Next</u-button-link>`,
  alert: `<u-alert variant="success">Saved</u-alert>`,
  modal: `<u-modal label="Delivery">Content</u-modal>`,
  icon: `<u-icon name="close" label="Close"></u-icon>`,
  // An icon given as markup renders on the server too (src/ssr.test.ts).
  "icon-markup": `<ssrmarkup-icon name="close" label="Close"></ssrmarkup-icon>`,
  "text-field": `<u-text-field label="Name" hint="As on your card" required></u-text-field>`,
  textarea: `<u-textarea label="Message"></u-textarea>`,
  autocomplete: `<u-autocomplete label="City"><option>Paris</option><option>Pau</option></u-autocomplete>`,
  checkbox: `<u-checkbox label="I agree" required checked></u-checkbox>`,
  switch: `<u-switch label="Notifications" checked></u-switch>`,
  radio: `<u-radio value="s" label="Small" checked></u-radio>`,
  "radio-group": `<u-radio-group label="Size" value="m"><u-radio value="s" label="Small"></u-radio><u-radio value="m" label="Medium"></u-radio></u-radio-group>`,
  "checkbox-group": `<u-checkbox-group label="Topics" name="topics"><u-checkbox label="News" value="news" checked></u-checkbox></u-checkbox-group>`,
  select: `<u-select label="Country" value="fr"><option value="fr">France</option><option value="be">Belgique</option></u-select>`,
  "number-field": `<u-number-field label="Quantity" min="1" max="10" value="2"></u-number-field>`,
  "date-field": `<u-date-field label="Birth date" value="2000-01-31"></u-date-field>`,
  slider: `<u-slider label="Volume" value="30"></u-slider>`,
  tab: `<u-tab value="a">First</u-tab>`,
  "tab-panel": `<u-tab-panel value="a">Content</u-tab-panel>`,
  tabs: `<u-tabs value="a"><u-tab value="a">First</u-tab><u-tab-panel value="a">Content</u-tab-panel></u-tabs>`,
  details: `<u-details label="Shipping" open>Free from 50 €.</u-details>`,
  breadcrumb: `<u-breadcrumb><u-breadcrumb-item href="/">Home</u-breadcrumb-item><u-breadcrumb-item>Orders</u-breadcrumb-item></u-breadcrumb>`,
  "breadcrumb-item": `<u-breadcrumb-item href="/">Home</u-breadcrumb-item>`,
  pagination: `<u-pagination page="3" pages="10"></u-pagination>`,
  toolbar: `<u-toolbar label="Format"><u-button>Bold</u-button><u-button>Italic</u-button></u-toolbar>`,
  menu: `<u-menu label="Actions"><u-menu-item>Rename</u-menu-item><u-menu-item>Delete</u-menu-item></u-menu>`,
  drawer: `<u-drawer label="Filters">Content</u-drawer>`,
  popover: `<u-popover label="Shipping">Free from 50 €.</u-popover>`,
  tooltip: `<u-tooltip><button>Copy</button><span slot="content">Copy the link</span></u-tooltip>`,
  toaster: `<u-toaster></u-toaster>`,
  "menu-item": `<u-menu-item>Rename</u-menu-item>`,
};

export default async function setup(project: TestProject): Promise<void> {
  // First: it installs the DOM the components need on a server.
  const { render } = await import("@lit-labs/ssr");
  const { collectResult } = await import("@lit-labs/ssr/lib/render-result.js");
  const { html, unsafeStatic } = await import("lit/static-html.js");
  const { allComponents } = await import("./registry/catalog.js");
  await import("./define.js");
  // The icons of the base as markup, not as modules to load: rendered here.
  // src/ssr.test.ts registers the same set.
  const { Icon } = await import("./components/icon/icon.js");
  const { defineComponents } = await import("./registry/define-components.js");
  const { default: close } = await import("@unicorne/icons/close");
  class MarkupIcon extends Icon {
    static override icons = { close };
  }
  defineComponents({ prefix: "ssrmarkup", components: [MarkupIcon] });

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
