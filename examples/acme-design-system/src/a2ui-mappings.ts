/**
 * ACME's A2UI catalog (ADR 0052 of the base): its ID, and what ACME adds to
 * the base's mappings. Plain data, like src/brand.ts: its documentation tools
 * write the catalog's document from it, in Node (`acme a2ui`), and its
 * adapters read it, in the browser (src/a2ui.ts).
 */
import type { A2uiMappingLayer } from "@unicorne/a2ui/document";

/** The ID ACME's agents and applications share. Its version changes at each breaking change. */
export const acmeCatalogId = "https://acme.example/a2ui/v1/catalog.json";

/**
 * ACME's own component, its card, over the base's mappings. The base's
 * mappings of components outside ACME's catalog (checkbox, radio group) are
 * left out of its document.
 */
export const acmeMappings: A2uiMappingLayer = {
  Card: { component: "card", attributes: ["heading"], children: "children" },
};
