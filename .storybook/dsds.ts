// Reads the components' DSDS documents (packages/components/src/components/**/*.dsds.yaml, see
// design-system.dsds.yaml) for the docs pages: their usage guidelines, in
// Markdown. The API stays in custom-elements.json.
import { parse } from "yaml";

export type Level = "must" | "should" | "may" | "should-not" | "must-not";

export interface Pointer {
  to?: string;
  href?: string;
  role?: string;
  note?: string;
}

export interface GuidelineItem {
  level?: Level;
  statement?: string;
  checkedBy?: "automated" | "assisted" | "manual";
  checks?: (Pointer | string)[];
  alternatives?: (Pointer | string)[];
}

export interface Section {
  kind: string;
  for: "all" | "human" | "agent";
  framing?: "when-to-use" | "how-to-use";
  title?: string;
  items?: GuidelineItem[];
}

export interface Trait {
  traitType: "variant" | "state";
  kind: "boolean" | "enum";
  id: string;
  description: string;
  values?: { id: string; description: string }[];
}

export interface ComponentEntry {
  kind: "component";
  id: string;
  name: string;
  description: string;
  sections?: Section[];
  traits?: Trait[];
  refs?: Pointer[];
  specs?: (Pointer | string)[];
  sourceFiles?: { platform: string; file: Pointer | string }[];
}

/** The documents, by path from the repository root. */
export const documents: Record<string, ComponentEntry> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("../packages/components/src/components/**/*.dsds.yaml", {
      query: "?raw",
      import: "default",
      eager: true,
    }),
  ).map(([path, source]) => [path.replace(/^\.\./, ""), parse(source) as ComponentEntry]),
);

const entries = new Map(Object.values(documents).map((entry) => [entry.id, entry]));

const LEVELS: Record<Level, string> = {
  must: "Obligatoire",
  should: "Recommandé",
  may: "Possible",
  "should-not": "Déconseillé",
  "must-not": "Interdit",
};

/**
 * `<dsds:id>` shows the target's name and `[text](dsds:id)` its text: a
 * `dsds:` URL is never output as a link (DSDS, Specification).
 */
function resolveLinks(markdown: string): string {
  return markdown
    .replace(/<dsds:([^>]+)>/g, (_, id: string) => `**${entries.get(id)?.name ?? id}**`)
    .replace(/\[([^\]]+)\]\(dsds:[^)]+\)/g, "$1");
}

const pointerText = (pointer: Pointer | string) =>
  typeof pointer === "string" ? pointer : (pointer.href ?? pointer.to ?? "");

/**
 * The guidelines of the component `tag` (`u-button`), in Markdown, for a
 * docs page: every section but those `for: agent`, which DSDS keeps out of
 * what people read. Empty when the component has no DSDS document.
 */
export function guidelinesMarkdown(tag: string | undefined): string {
  const entry = tag && entries.get(tag.replace(/^u-/, ""));
  if (!entry) {
    return "";
  }
  const guidelines = (entry.sections ?? [])
    .filter((section) => section.kind === "guidelines" && section.for !== "agent")
    .map((section) => {
      const title =
        section.framing === "when-to-use" ? "Quand l'utiliser" : (section.title ?? "Règles");
      const items = (section.items ?? []).map((item) => {
        const checks = item.checks?.length
          ? ` _Vérifié par ${item.checks.map((check) => `\`${pointerText(check).replace(/^(\.\.?\/)+/, "")}\``).join(", ")}._`
          : "";
        return `- **${LEVELS[item.level ?? "should"]} :** ${resolveLinks(item.statement ?? "")}${checks}`;
      });
      return `## ${title}\n\n${items.join("\n")}`;
    });
  const traits = (entry.traits ?? []).map((trait) => {
    const values = (trait.values ?? []).map(
      (value) => `  - \`${value.id}\` : ${resolveLinks(value.description)}`,
    );
    return [`- \`${trait.id}\` : ${resolveLinks(trait.description)}`, ...values].join("\n");
  });
  if (traits.length) {
    guidelines.push(`## Sens des valeurs\n\n${traits.join("\n")}`);
  }
  return guidelines.join("\n\n");
}
