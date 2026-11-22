/**
 * ACME's documentation, for its tools (ADR 0039 of the base): the
 * components of its catalog, its own and its overrides, their usage rules,
 * and its texts. `acme` and `acme-mcp` (bin/) consult it. Node only.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extendDocs,
  readUsage,
  type CustomElementsManifest,
  type DesignSystemDocs,
} from "@unicorne/catalog";
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { catalog, labels } from "./brand.js";

/**
 * A file of the package, from src/ or dist/: at its root. Not `new URL(…,
 * import.meta.url)`: Vite would inline the file in the build.
 */
const fileOf = (path: string) => join(dirname(fileURLToPath(import.meta.url)), "..", path);

/** The texts of ACME, for its tools: those that are plain text. */
export const texts: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(labels).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);

/** ACME's documentation: what `acme` and `acme-mcp` consult. */
export async function loadAcmeDocs(): Promise<DesignSystemDocs> {
  const manifest = JSON.parse(
    await readFile(fileOf("custom-elements.json"), "utf8"),
  ) as CustomElementsManifest;
  return extendDocs(await loadSocleDocs(), {
    name: "ACME",
    prefix: "acme",
    package: "@acme/design-system",
    description: "Le design system d'ACME : ses composants, en français, aux couleurs d'ACME.",
    catalog,
    labels,
    manifest,
    usage: await readUsage(fileOf("design-system.dsds.yaml")),
    importCode: (component) =>
      [
        `import { acme, ${component.className} } from "@acme/design-system";`,
        `await acme.define(${component.className});`,
      ].join("\n"),
  });
}
