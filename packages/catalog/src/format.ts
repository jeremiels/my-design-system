import type {
  ComponentDoc,
  DesignSystemDocs,
  Diagnostic,
  Guideline,
  IconDoc,
  Member,
  TokenDoc,
  TokenLevel,
} from "./model.ts";
import type { SearchResult } from "./query.ts";
import { searchIcons, type IconSearchResult } from "./icons.ts";
import { filterTokens, type TokenFilter, type TokenSearchResult } from "./tokens.ts";

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

/** What reports a broken rule, for its audience: the tool of an agent, the command of people. */
const CHECKER: Record<Audience, string> = { agent: "check_markup", human: "`check`" };

/** A rule, as a line of a list. */
function ruleLine(rule: Guideline, audience: Audience): string {
  const instead =
    rule.alternatives.length > 0
      ? ` Instead: ${rule.alternatives.map((name) => `\`${name}\``).join(", ")}.`
      : "";
  // `assisted`: the check finds the likely cases, a person the rest (DSDS).
  const checked = rule.check
    ? ` _${rule.checkedBy === "assisted" ? "Partly checked" : "Checked"} by ${CHECKER[audience]}._`
    : "";
  return `- **${LEVELS[rule.level]}** ${rule.statement}${instead}${checked}`;
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
    ...(whenToUse.length > 0
      ? ["", "## When to use", "", ...whenToUse.map((rule) => ruleLine(rule, audience))]
      : []),
    ...[...sections].flatMap(([title, list]) => [
      "",
      `## ${title}`,
      "",
      ...list.map((rule) => ruleLine(rule, audience)),
    ]),
    ...membersSection("Attributes", component.attributes),
    ...membersSection("Properties", component.properties),
    ...membersSection("Events", component.events),
    ...membersSection("Slots", component.slots, "(default slot)"),
    ...membersSection("CSS parts", component.parts),
    ...membersSection("CSS custom properties", component.tokens),
    ...membersSection("Methods", component.methods),
    // The values of `name`: the icon set (ADR 0044).
    ...(component.name === "icon" && docs.icons.length > 0
      ? [
          "",
          "## Icons",
          "",
          `${docs.icons.length} icons, by \`name\`: ${docs.icons.map(({ name }) => `\`${name}\``).join(", ")}.`,
        ]
      : []),
  ].join("\n");
}

/** What matched, under a result. */
const matchesLine = (matches: readonly string[]) =>
  matches.length > 0 ? `\n  Matches: ${matches.map((match) => match.slice(0, 80)).join("; ")}` : "";

/** The results of a search, in Markdown: the components, the tokens, then the icons. */
export function formatSearchResults(
  query: string,
  results: readonly SearchResult[],
  tokens: readonly TokenSearchResult[] = [],
  icons: readonly IconSearchResult[] = [],
): string {
  const sections: [title: string, lines: string[]][] = [
    [
      "Components",
      results.map(
        ({ component, matches }) =>
          `- \`${component.tag}\` — ${component.summary}${matchesLine(matches)}`,
      ),
    ],
    ["Tokens", tokens.map(({ token, matches }) => `${tokenLine(token)}${matchesLine(matches)}`)],
    ["Icons", icons.map(({ icon, matches }) => `${iconLine(icon)}${matchesLine(matches)}`)],
  ];
  const found = sections.filter(([, lines]) => lines.length > 0);
  if (found.length === 0) {
    return `Nothing matches "${query}".`;
  }
  // One kind of result needs no heading.
  return found.length === 1
    ? found[0]![1].join("\n")
    : found.map(([title, lines]) => [`## ${title}`, "", ...lines].join("\n")).join("\n\n");
}

/** An icon, as a line of a list: its name, its meaning, its tags. */
function iconLine(icon: IconDoc): string {
  const tags = icon.tags.length > 0 ? ` (${icon.tags.join(", ")})` : "";
  const aliases = (icon.aliases ?? []).map(
    ({ name, deprecated }) => `\`${name}\`${deprecated ? " (deprecated)" : ""}`,
  );
  return `- \`${icon.name}\`${icon.description ? ` — ${icon.description}` : ""}${tags}${
    aliases.length > 0 ? ` Also: ${aliases.join(", ")}.` : ""
  }`;
}

/**
 * The icons of a design system, in Markdown, by category: all of them, or
 * those whose name, tags, categories or description hold every word of
 * `query`.
 */
export function formatIconList(docs: DesignSystemDocs, query = ""): string {
  const icon = docs.components.find(({ name }) => name === "icon");
  const usage = icon ? `<${icon.tag} name="…">` : `name="…"`;
  const found = searchIcons(docs, query).map(({ icon: found }) => found);
  const heading = [`# ${docs.name} icons${query ? `: ${query}` : ""}`, ""];
  if (found.length === 0) {
    return [...heading, docs.icons.length === 0 ? "No icon." : "No icon matches."].join("\n");
  }
  const groups = new Map<string, IconDoc[]>();
  for (const each of query ? found : [...found].sort((a, b) => a.name.localeCompare(b.name))) {
    const category = each.categories[0] ?? "other";
    groups.set(category, [...(groups.get(category) ?? []), each]);
  }
  return [
    ...heading,
    `${plural(found.length, "icon")}, as \`${usage}\`. An icon takes the color of the text.`,
    ...[...groups].flatMap(([category, list]) => ["", `## ${category}`, "", ...list.map(iconLine)]),
  ].join("\n");
}

const LEVEL_NAMES: Record<TokenLevel, string> = {
  primitive: "primitive",
  semantic: "semantic token",
  component: "component token",
};

/** The page modifiers: a list shows their values, a token page shows every context. */
const PAGE_CONTEXT = /^(theme|motion):/;

/** A token, as a line of a list: its property, its value, its themes, its use. */
function tokenLine(token: TokenDoc): string {
  const contexts = Object.entries(token.contexts).filter(([context]) => PAGE_CONTEXT.test(context));
  const others = Object.keys(token.contexts).length - contexts.length;
  const values = [
    `\`${token.value}\``,
    ...contexts.map(([context, { value }]) => `${context} \`${value}\``),
  ].join(" · ");
  const more = others > 0 ? ` (+${others} contexts)` : "";
  const description = token.description ? ` — ${token.description.replace(/\s*\n\s*/g, " ")}` : "";
  return `- \`${token.name}\` ${values}${more}${description}`;
}

/** `1 token`, `3 tokens`. */
const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Above this many tokens, a list gives its groups instead. */
const LIST_LIMIT = 100;

/**
 * The tokens of a design system, in Markdown, by group. Without a filter,
 * its semantic tokens: what an application uses. Past 100 tokens, the groups
 * and their counts, to filter on.
 */
export function formatTokenList(docs: DesignSystemDocs, filter: TokenFilter = {}): string {
  const unfiltered = !filter.level && !filter.group && !filter.type;
  const tokens = filterTokens(docs, unfiltered ? { level: "semantic" } : filter);
  const what = [filter.level, filter.group, filter.type].filter(Boolean).join(", ");
  const heading = [`# ${docs.name} tokens${what ? `: ${what}` : ""}`, ""];
  if (tokens.length === 0) {
    return [...heading, "No token matches."].join("\n");
  }
  const groups = new Map<string, TokenDoc[]>();
  for (const token of tokens) {
    groups.set(token.group, [...(groups.get(token.group) ?? []), token]);
  }
  const count = (level: TokenLevel) => docs.tokens.filter((token) => token.level === level).length;
  const intro = unfiltered
    ? `${tokens.length} semantic tokens: use them in CSS as \`var(--…)\`, never a raw value. Also ${count("primitive")} primitives and ${count("component")} component tokens: filter by level or group.`
    : plural(tokens.length, "token");
  // The rules of the groups the list is in (ADR 0050): `spacing` for `spacing`,
  // `font` for `font.size`. Unfiltered, the groups that have rules.
  const ruled = docs.tokenGroups.filter(
    ({ name }) => filter.group === name || filter.group?.startsWith(`${name}.`),
  );
  const rules = unfiltered
    ? docs.tokenGroups.length > 0
      ? [
          "",
          `Usage rules of ${docs.tokenGroups.map(({ name }) => `\`${name}\``).join(", ")}: list the group.`,
        ]
      : []
    : ruled.flatMap(({ name, guidelines }) => [
        "",
        `## Rules of \`${name}\``,
        "",
        ...guidelines.map((rule) => ruleLine(rule, "human")),
      ]);
  if (tokens.length > LIST_LIMIT) {
    return [
      ...heading,
      `${intro} Too many to list: filter by one of these groups.`,
      ...rules,
      "",
      ...[...groups].map(([group, list]) => `- \`${group}\` — ${plural(list.length, "token")}`),
    ].join("\n");
  }
  return [
    ...heading,
    intro,
    ...rules,
    ...[...groups].flatMap(([group, list]) => ["", `## ${group}`, "", ...list.map(tokenLine)]),
  ].join("\n");
}

/** Everything the docs say of a token, in Markdown: its use, its values, its aliases. */
export function formatToken(docs: DesignSystemDocs, token: TokenDoc): string {
  const byId = new Map(docs.tokens.map((other) => [other.id, other]));
  const chain = (ids: readonly string[]) =>
    ids.length > 0 ? ` ← ${ids.map((id) => `\`${byId.get(id)?.name ?? id}\``).join(" ← ")}` : "";
  const aliasedBy = (level: TokenLevel) =>
    docs.tokens.filter(
      (other) =>
        other.level === level &&
        (other.aliasChain.includes(token.id) ||
          Object.values(other.contexts).some(({ aliasChain }) => aliasChain.includes(token.id))),
    );
  const semantic = token.level === "primitive" ? aliasedBy("semantic") : [];
  const readBy =
    token.level === "component"
      ? docs.components.filter((component) =>
          component.tokens.some((member) => member.name === token.name),
        )
      : [];
  return [
    `# \`${token.name}\``,
    "",
    `\`${token.id}\` · ${LEVEL_NAMES[token.level]} · ${token.type}`,
    ...(token.description ? ["", token.description] : []),
    "",
    "## Use",
    "",
    ...(token.usage ? [token.usage, ""] : []),
    // A text style: its class, or the `font` shorthand and its letter spacing (ADR 0051).
    ...(token.className
      ? [
          `In HTML: \`class="${token.className}"\`.`,
          `In CSS: \`font: var(${token.name})\`${
            token.parts?.["letter-spacing"]
              ? `, and \`letter-spacing: var(${byId.get(token.parts["letter-spacing"])?.name ?? token.parts["letter-spacing"]})\``
              : ""
          }.`,
        ]
      : [`In CSS: \`var(${token.name})\`.`]),
    // Its usage rules, from its DSDS entry (ADR 0046).
    ...((token.guidelines ?? []).length > 0
      ? ["", ...(token.guidelines ?? []).map((rule) => ruleLine(rule, "human"))]
      : []),
    ...(token.level === "primitive"
      ? [
          "",
          "A primitive is a raw value: prefer the semantic token of the intent.",
          ...(semantic.length > 0
            ? ["", ...semantic.map((other) => `- \`${other.name}\` — ${other.description ?? ""}`)]
            : []),
        ]
      : []),
    ...(readBy.length > 0
      ? ["", `Read by ${readBy.map((component) => `\`<${component.tag}>\``).join(", ")}.`]
      : []),
    "",
    // The tokens it goes with: a color's backgrounds, a duration's curve (ADR 0046, 0050).
    ...((token.combos ?? []).length > 0
      ? [
          "## Pairs",
          "",
          ...(token.combos ?? []).map(
            ({ level, items, note }) =>
              `- **${LEVELS[level]}** be paired with ${items
                .map((id) => `\`${byId.get(id)?.name ?? id}\``)
                .join(", ")}.${note ? ` ${note}` : ""}`,
          ),
          "",
        ]
      : []),
    ...(token.parts
      ? [
          "## Parts",
          "",
          ...Object.entries(token.parts).map(
            ([property, id]) => `- ${property}: \`${byId.get(id)?.name ?? id}\``,
          ),
          "",
        ]
      : []),
    "## Values",
    "",
    `- default: \`${token.value}\`${chain(token.aliasChain)}`,
    ...Object.entries(token.contexts).map(
      ([context, { value, aliasChain }]) => `- ${context}: \`${value}\`${chain(aliasChain)}`,
    ),
  ].join("\n");
}

/** Diagnostics, one line each, the usage rule they break under them, then a count. */
export function formatDiagnostics(diagnostics: readonly Diagnostic[]): string {
  const errors = diagnostics.filter(({ severity }) => severity === "error").length;
  const warnings = diagnostics.length - errors;
  const safe = diagnostics.filter(({ fix }) => fix?.safe).length;
  const unsafe = diagnostics.filter(({ fix }) => fix && !fix.safe).length;
  const lines = diagnostics.map(
    ({ file, line, column, severity, message, rule, guideline, fix, suggestions }) =>
      `${file ? `${file}:` : ""}${line}:${column} ${severity} ${message} (${rule})${
        fix ? (fix.safe ? " [fix]" : " [unsafe fix]") : suggestions?.length ? " [suggestion]" : ""
      }${guideline ? `\n  ${guideline.replace(/\s*\n\s*/g, " ")}` : ""}`,
  );
  return [
    ...lines,
    `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.${
      safe + unsafe > 0 ? ` Fixes: ${safe} safe, ${unsafe} unsafe.` : ""
    }`,
  ].join("\n");
}
