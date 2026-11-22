import type { ComponentDoc, DesignSystemDocs, Diagnostic, Guideline, Member } from "./model.ts";
import type { SearchResult } from "./query.ts";

/** Who reads the text: people (a CLI) or agents (an MCP server). Each sees its rules. */
export type Audience = "human" | "agent";

/** The rules `audience` reads. */
const rulesFor = (rules: readonly Guideline[], audience: Audience) =>
  rules.filter((rule) => rule.audience === "all" || rule.audience === audience);

const LEVELS: Record<Guideline["level"], string> = {
  must: "MUST",
  should: "SHOULD",
  may: "MAY",
  "should-not": "SHOULD NOT",
  "must-not": "MUST NOT",
};

/** A rule, as a line of a list. */
function ruleLine(rule: Guideline): string {
  const instead =
    rule.alternatives.length > 0
      ? ` Instead: ${rule.alternatives.map((name) => `\`${name}\``).join(", ")}.`
      : "";
  return `- **${LEVELS[rule.level]}** ${rule.statement}${instead}`;
}

/** A member, as a line of a list. */
function memberLine(member: Member, defaultName = "(default)"): string {
  const name = member.name === "" ? defaultName : `\`${member.name}\``;
  const type = member.type ? ` \`${member.type}\`` : "";
  const fallback = member.default ? ` = \`${member.default}\`` : "";
  const property =
    member.property && member.property !== member.name ? ` (property \`${member.property}\`)` : "";
  const description = member.description
    ? ` — ${member.description.replace(/\s*\n\s*/g, " ")}`
    : "";
  return `- ${name}${type}${fallback}${property}${description}`;
}

/** A section of members, or nothing without one. */
function membersSection(title: string, members: readonly Member[], defaultName?: string): string[] {
  return members.length > 0
    ? ["", `## ${title}`, "", ...members.map((member) => memberLine(member, defaultName))]
    : [];
}

/** The components of a design system, one line each, in Markdown. */
export function formatComponentList(docs: DesignSystemDocs): string {
  return [
    `# ${docs.name}`,
    ...(docs.description ? ["", docs.description] : []),
    "",
    `${docs.components.length} components, as \`<${docs.prefix}-…>\` elements, from \`${docs.package}\`.`,
    "",
    ...docs.components.map(
      (component) => `- \`${component.tag}\`${component.summary ? ` — ${component.summary}` : ""}`,
    ),
  ].join("\n");
}

/** Everything the docs say of a component, in Markdown: its usage, its rules, its API. */
export function formatComponent(
  docs: DesignSystemDocs,
  component: ComponentDoc,
  audience: Audience = "human",
): string {
  const rules = rulesFor(component.guidelines, audience);
  const whenToUse = rules.filter((rule) => rule.framing === "when-to-use");
  const howToUse = rules.filter((rule) => rule.framing === "how-to-use");
  const sections = new Map<string, Guideline[]>();
  for (const rule of howToUse) {
    const title = rule.section ?? "Rules";
    sections.set(title, [...(sections.get(title) ?? []), rule]);
  }
  return [
    `# <${component.tag}>`,
    "",
    component.summary,
    ...(component.usage ? ["", component.usage] : []),
    ...(component.description ? ["", component.description] : []),
    "",
    "## Import",
    "",
    "```js",
    docs.importCode(component),
    "```",
    ...(whenToUse.length > 0 ? ["", "## When to use", "", ...whenToUse.map(ruleLine)] : []),
    ...[...sections].flatMap(([title, list]) => ["", `## ${title}`, "", ...list.map(ruleLine)]),
    ...membersSection("Attributes", component.attributes),
    ...membersSection("Properties", component.properties),
    ...membersSection("Events", component.events),
    ...membersSection("Slots", component.slots, "(default slot)"),
    ...membersSection("CSS parts", component.parts),
    ...membersSection("CSS custom properties", component.tokens),
    ...membersSection("Methods", component.methods),
  ].join("\n");
}

/** The results of a search, in Markdown. */
export function formatSearchResults(query: string, results: readonly SearchResult[]): string {
  if (results.length === 0) {
    return `No component matches "${query}".`;
  }
  return results
    .map(
      ({ component, matches }) =>
        `- \`${component.tag}\` — ${component.summary}${
          matches.length > 0
            ? `\n  Matches: ${matches.map((match) => match.slice(0, 80)).join("; ")}`
            : ""
        }`,
    )
    .join("\n");
}

/** Diagnostics, one line each, then a count. */
export function formatDiagnostics(diagnostics: readonly Diagnostic[]): string {
  const errors = diagnostics.filter(({ severity }) => severity === "error").length;
  const warnings = diagnostics.length - errors;
  const lines = diagnostics.map(
    ({ file, line, column, severity, message, rule }) =>
      `${file ? `${file}:` : ""}${line}:${column} ${severity} ${message} (${rule})`,
  );
  return [
    ...lines,
    `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`,
  ].join("\n");
}
