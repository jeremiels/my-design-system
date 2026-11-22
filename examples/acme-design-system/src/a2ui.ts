/**
 * ACME's components in an A2UI surface (ADR 0052 of the base), for an
 * application that shows the interface of an agent. It loads this entry on
 * that page only: the A2UI renderer weighs on the pages that use it.
 */
import type { Catalog, ComponentApi } from "@a2ui/web_core";
import { a2uiCatalog, socleComponents, type A2uiCatalogDocument } from "@unicorne/a2ui";
import { AcmeCard } from "./components/acme-card/acme-card.js";
import { acme } from "./design-system.js";
import { acmeMappings } from "./a2ui-mappings.js";

export { acmeCatalogId, acmeMappings } from "./a2ui-mappings.js";

/**
 * ACME's A2UI catalog, for the renderer's `MessageProcessor`: it registers
 * the components of `document`, with ACME's overrides, and their adapters.
 *
 * @example
 * import "@a2ui/lit";
 * import { MessageProcessor } from "@a2ui/web_core";
 * import { acmeA2uiCatalog } from "@acme/design-system/a2ui";
 * import document from "@acme/design-system/a2ui-catalog.json";
 *
 * const processor = new MessageProcessor([await acmeA2uiCatalog(document)], sendToAgent);
 */
export function acmeA2uiCatalog(
  document: A2uiCatalogDocument | Readonly<Record<string, unknown>>,
): Promise<Catalog<ComponentApi>> {
  return a2uiCatalog({
    designSystem: acme,
    document,
    components: { ...socleComponents, card: AcmeCard },
    mappings: acmeMappings,
  });
}
