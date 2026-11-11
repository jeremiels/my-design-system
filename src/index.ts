// Side-effect free: classes, building blocks for brand components and the
// registration API. Import "my-design-system/define" to register the catalog
// under the default `u-` prefix, or call defineComponents() with a brand
// prefix (ADR 0001, D1).
export * from "./components/base-element.js";
export * from "./components/button/button.js";
export * from "./components/button/button-link.js";
export * from "./components/alert/alert.js";
export * from "./components/modal/modal.js";
export * from "./mixins/withDisabled.js";
export * from "./mixins/withInternals.js";
export * from "./events/modal-close.js";
export type * from "./types/common.js";
export type * from "./components/button/button.type.js";
export type * from "./components/alert/alert.type.js";
export { allComponents } from "./registry/catalog.js";
export { defineComponents, type DefineComponentsOptions } from "./registry/define-components.js";
