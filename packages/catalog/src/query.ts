import type { ComponentDoc, DesignSystemDocs } from "./model.ts";

/** A component by its name or its tag, in any case: `button`, `acme-button`. */
export function findComponent(docs: DesignSystemDocs, query: string): ComponentDoc | undefined {
  const name = query
    .trim()
    .toLowerCase()
    .replace(/^<|\/?>$/g, "");
  return docs.components.find((component) => component.name === name || component.tag === name);
}

/** A component that `search()` found, with what matched. */
export interface SearchResult {
  readonly component: ComponentDoc;
  readonly score: number;
  /** What matched, in the words of the docs: `attribute variant`, `rule: …`. */
  readonly matches: readonly string[];
}

/** A text without case nor accents, for a search. */
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * The components whose docs hold every word of `query`, without case nor
 * accents: their names, summaries, descriptions, members and rules. The best
 * first: a word in the name counts most, then in the summary.
 */
export function searchDocs(
  docs: DesignSystemDocs,
  query: string,
  { limit = 10 }: { limit?: number } = {},
): SearchResult[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const results: SearchResult[] = [];
  for (const component of docs.components) {
    const fields: [weight: number, label: string, text: string][] = [
      [10, "name", `${component.name} ${component.tag}`],
      [5, "summary", component.summary],
      [3, "usage", component.usage ?? ""],
      [2, "description", component.description],
      ...[
        ["attribute", component.attributes],
        ["property", component.properties],
        ["event", component.events],
        ["slot", component.slots],
        ["part", component.parts],
        ["token", component.tokens],
        ["method", component.methods],
      ].flatMap(([kind, members]) =>
        (members as ComponentDoc["attributes"]).map((member): [number, string, string] => [
          2,
          `${kind as string} ${member.name}`,
          `${member.name} ${member.description ?? ""}`,
        ]),
      ),
      ...component.guidelines.map((rule): [number, string, string] => [
        2,
        `rule: ${rule.statement}`,
        rule.statement,
      ]),
    ];
    let score = 0;
    const matches: string[] = [];
    let found = 0;
    for (const word of words) {
      let hit = false;
      for (const [weight, label, text] of fields) {
        if (normalize(text).includes(word)) {
          hit = true;
          score += weight;
          if (!matches.includes(label) && label !== "name") {
            matches.push(label);
          }
        }
      }
      if (hit) {
        found += 1;
      }
    }
    if (found === words.length) {
      results.push({ component, score, matches: matches.slice(0, 5) });
    }
  }
  return results
    .sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name))
    .slice(0, limit);
}
