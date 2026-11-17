// ACME republishes the base (components, building blocks, types) next to its
// own, so apps depend on @acme/design-system only. ACME's button is only a
// type here: its class loads with the first component that renders a button
// (src/design-system.ts), and "@acme/design-system/acme-button" exports it.
export * from "@unicorne/components";
export type { AcmeButton } from "./components/acme-button/acme-button.js";
export * from "./components/acme-card/acme-card.js";
export type { AcmeCatalog } from "./catalog.js";
export { acme } from "./design-system.js";
