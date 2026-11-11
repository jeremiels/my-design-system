// Side-effect free: classes and the registration API only. Import
// "my-design-system/define" to register the catalog under the default `my-`
// prefix, or call defineComponents() with a brand prefix (ADR 0001, D1).
export * from "./components/MyDSBaseElement.js";
export * from "./components/button/button.js";
export * from "./components/button/button-link.js";
export * from "./components/alert/alert.js";
export * from "./components/modal/modal.js";
export { allComponents } from "./registry/catalog.js";
export { defineComponents, type DefineComponentsOptions } from "./registry/define-components.js";
