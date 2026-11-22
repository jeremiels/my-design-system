// The documentation of a design system, for its tools (ADR 0039).
export type * from "./model.ts";
export { createDocs, extendDocs, type DocsLayer, type DocsSource } from "./docs.ts";
export { readUsage, EXTENSIONS_NAMESPACE, type ComponentUsage, type UsageDocs } from "./dsds.ts";
export { componentsOfManifest, valuesOf, type CustomElementsManifest } from "./manifest.ts";
export { findComponent, searchDocs, type SearchResult } from "./query.ts";
export {
  checkMarkup,
  defaultRules,
  invalidValue,
  unknownAttribute,
  unknownEvent,
  unknownSlot,
  type CheckOptions,
} from "./check.ts";
export {
  formatComponent,
  formatComponentList,
  formatDiagnostics,
  formatSearchResults,
  type Audience,
} from "./format.ts";
