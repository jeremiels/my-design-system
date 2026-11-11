/**
 * CSS module scripts: `import sheet from "./x.css" with { type: "css" }`
 * gives a constructable `CSSStyleSheet` (see plugins/css-import-attributes.ts).
 *
 * TypeScript can't key a module's type on its import attributes, so this
 * types the default export of every `*.css` import. Only use a default import
 * together with `with { type: "css" }` — side-effect imports
 * (`import "./main.css"`) are unaffected.
 */
declare module "*.css" {
  const sheet: CSSStyleSheet;
  export default sheet;
}
