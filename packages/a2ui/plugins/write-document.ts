// Writes the base's A2UI catalog (ADR 0052), from its documentation:
// `npm run a2ui`. `a2ui:check` compares it with the committed file.
import { writeFile } from "node:fs/promises";
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { a2uiCatalogDocument } from "../src/document.ts";

const document = a2uiCatalogDocument(await loadSocleDocs(), {
  catalogId: "https://unicorne.example/a2ui/v1/catalog.json",
});
await writeFile(
  new URL("../a2ui-catalog.json", import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
);
