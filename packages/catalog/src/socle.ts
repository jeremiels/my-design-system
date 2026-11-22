import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { createDocs } from "./docs.ts";
import { readUsage } from "./dsds.ts";
import type { CustomElementsManifest } from "./manifest.ts";
import type { DesignSystemDocs } from "./model.ts";

/** A reference to an ADR of the base, in parentheses: `(ADR 0031)`, `(ADR 0001, D2)`. */
const ADR_REFERENCE = /\s*\([^()]*\bADRs? \d{4}\b[^()]*\)/g;

/** A base class or a controller of the base, in code: `FieldBase`, `ListboxController`. */
const BASE_CLASS = /`[A-Z]\w*(?:Base|Controller)`/;

/**
 * Leaves out the sentences that name a base class or a controller of the
 * base: "The label and the hint are those of `FieldBase`." They guide the
 * authors of a design system, not the users of its components.
 */
export function withoutBaseClasses(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      const kept = sentences.filter((sentence) => !BASE_CLASS.test(sentence));
      return kept.length === sentences.length ? paragraph : kept.join(" ");
    })
    .filter((paragraph) => paragraph.trim() !== "")
    .join("\n\n");
}

/** The path of a file of `@unicorne/components`. */
const fileOf = (path: string) => fileURLToPath(import.meta.resolve(`@unicorne/components/${path}`));

/**
 * The documentation of the base: the components of `@unicorne/components`,
 * from its manifest and its DSDS documents. A design system extends it with
 * `extendDocs()`: the references to the base's ADRs leave its view.
 */
export async function loadSocleDocs(): Promise<DesignSystemDocs> {
  const manifest = JSON.parse(
    await readFile(fileOf("custom-elements.json"), "utf8"),
  ) as CustomElementsManifest;
  const root = fileOf("design-system.dsds.yaml");
  const system = (parse(await readFile(root, "utf8")) as { entries?: { description?: string }[] })
    .entries?.[0];
  return createDocs({
    name: "Unicorne",
    prefix: "u",
    package: "@unicorne/components",
    description: system?.description?.trim() ?? "",
    manifest,
    usage: await readUsage(root),
    importCode: (component) =>
      [
        `import { defineComponents, ${component.className} } from "@unicorne/components";`,
        `defineComponents({ prefix: "u", components: [${component.className}] });`,
      ].join("\n"),
    internal: [ADR_REFERENCE, withoutBaseClasses],
  });
}
