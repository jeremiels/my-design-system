// The documentation of a design system, for its tools (ADR 0039): its
// components, its tokens (ADR 0042), its icons (ADR 0044), and `check` on
// markup and on CSS (ADR 0040, ADR 0043).
export type * from "./model.ts";
export { createDocs, extendDocs, type DocsLayer, type DocsSource } from "./docs.ts";
export {
  readTokenUsage,
  readUsage,
  EXTENSIONS_NAMESPACE,
  type ComponentUsage,
  type TokenUsage,
  type TokenUsageDocs,
  type UsageDocs,
} from "./dsds.ts";
export { componentsOfManifest, valuesOf, type CustomElementsManifest } from "./manifest.ts";
export { findComponent, searchDocs, type SearchResult } from "./query.ts";
export {
  filterTokens,
  findToken,
  normalizeValue,
  readTokenManifest,
  searchTokens,
  tokensOfManifest,
  type TokenFilter,
  type TokenManifest,
  type TokenSearchResult,
} from "./tokens.ts";
export {
  checkMarkup,
  defaultRules,
  deprecatedIcon,
  invalidValue,
  unknownAttribute,
  unknownIcon,
  unknownEvent,
  unknownSlot,
  type CheckOptions,
} from "./check.ts";
export { applyFixes, fixMarkup, type FixOptions, type FixResult } from "./fix.ts";
export { spellingDistance, spellingSuggestion } from "./spelling.ts";
export { positionOf, scriptTemplates, type ScriptTemplate } from "./templates.ts";
export {
  closeIcons,
  findIcon,
  iconsOfManifest,
  mergeIcons,
  readIconManifest,
  searchIcons,
  type IconManifest,
  type IconSearchResult,
} from "./icons.ts";
export {
  checkCss,
  defaultCssRules,
  primitiveToken,
  rawValue,
  tokenPair,
  unknownToken,
  vueStyles,
  type CssCheckOptions,
} from "./css-check.ts";
export { colorDistance, parseColor, type Rgb } from "./colors.ts";
export {
  accessibleName,
  allowedChildren,
  forbiddenAncestor,
  requiredAttribute,
  requiredParent,
  usageRules,
} from "./usage-rules.ts";
export {
  formatComponent,
  formatComponentList,
  formatDiagnostics,
  formatIconList,
  formatSearchResults,
  formatToken,
  formatTokenList,
  type Audience,
} from "./format.ts";
