/**
 * CSS module scripts: `import sheet from "./x.css" with { type: "css" }`
 * gives a Lit `CSSResult`, for `static styles` (see
 * plugins/css-import-attributes.ts): Lit adopts it as a constructable
 * `CSSStyleSheet` in the browser, and renders its text on a server.
 *
 * TypeScript can't key a module's type on its import attributes, so this
 * types the default export of every `*.css` import. Only use a default import
 * together with `with { type: "css" }` — side-effect imports
 * (`import "./main.css"`) are unaffected.
 */
declare module "*.css" {
  import type { CSSResult } from "lit";

  const sheet: CSSResult;
  export default sheet;
}
