import type { Catalog } from "@unicorne/components";
import type { AcmeButton } from "./components/acme-button/acme-button.js";
import type { AcmeCard } from "./components/acme-card/acme-card.js";

/**
 * ACME's catalog, as types: the base's without `button-link`, ACME's button
 * in place of the base's, and ACME's card. The types of ACME's tags derive
 * from it: `HTMLElementTagNameMap` (src/define.ts) and Vue's
 * `GlobalComponents` (src/vue.ts).
 */
export interface AcmeCatalog extends Omit<Catalog, "button" | "button-link"> {
  button: { element: AcmeButton; events: {} };
  card: { element: AcmeCard; events: {} };
}
