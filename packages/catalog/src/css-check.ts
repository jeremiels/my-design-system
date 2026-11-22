import postcss, { CssSyntaxError, type Root } from "postcss";
import { colorDistance, parseColor, type Rgb } from "./colors.ts";
import type {
  CssDeclaration,
  CssRule,
  DesignSystemDocs,
  Diagnostic,
  Fix,
  TokenDoc,
} from "./model.ts";
import { spellingSuggestion } from "./spelling.ts";
import { normalizeValue } from "./tokens.ts";

/**
 * `check` on CSS (ADR 0043): the use of the design system's tokens in a
 * style sheet, a `<style>` of a Vue component or a `style` attribute. A
 * custom property of the design system that doesn't exist, a primitive used
 * for an intent, a raw value a semantic token holds.
 */

/** What the rules compute once per documentation. */
interface TokenIndex {
  /** Every custom property of the design system: its tokens, and those its components document. */
  readonly names: ReadonlySet<string>;
  /** The starts of its custom properties: `--u-`, `--acme-`. */
  readonly prefixes: readonly string[];
  readonly byName: ReadonlyMap<string, TokenDoc>;
  /** Its semantic colors, parsed. */
  readonly colors: readonly { token: TokenDoc; rgb: Rgb }[];
}

const indexes = new WeakMap<DesignSystemDocs, TokenIndex>();

function indexOf(docs: DesignSystemDocs): TokenIndex {
  let index = indexes.get(docs);
  if (!index) {
    const names = new Set([
      ...docs.tokens.map(({ name }) => name),
      ...docs.components.flatMap(({ tokens }) => tokens.map(({ name }) => name)),
    ]);
    index = {
      names,
      prefixes: [
        ...new Set(
          [...names].map((name) => /^--[a-z0-9]+-/.exec(name)?.[0]).filter((p) => p !== undefined),
        ),
      ],
      byName: new Map(docs.tokens.map((token) => [token.name, token])),
      colors: docs.tokens
        .filter(({ level, type }) => level === "semantic" && type === "color")
        .flatMap((token) => {
          const rgb = parseColor(token.value);
          return rgb ? [{ token, rgb }] : [];
        }),
    };
    indexes.set(docs, index);
  }
  return index;
}

/** The custom properties a value reads: `var(--u-spacing-md, 1rem)` gives `--u-spacing-md`. */
const varsIn = (value: string) =>
  [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(([, name]) => name!);

/** A list of custom properties, as code: `` `var(--a)`, `var(--b)` ``. */
const vars = (tokens: readonly TokenDoc[]) =>
  tokens.map(({ name }) => `\`var(${name})\``).join(", ");

/**
 * Whether a token changes with the theme or the reduced motion: replacing a
 * value by it changes what a page shows in that context.
 */
const followsContext = (token: TokenDoc) =>
  Object.keys(token.contexts).some((context) => /^(theme|motion):/.test(context));

/**
 * The fix that writes `text` over the characters of the value from `index`,
 * when the value can be fixed in place.
 */
function fixAt(
  { valueStart }: CssDeclaration,
  index: number,
  length: number,
  text: string,
  safe: boolean,
): { fix: Fix } | Record<string, never> {
  return valueStart === undefined
    ? {}
    : { fix: { start: valueStart + index, end: valueStart + index + length, text, safe } };
}

/** A custom property of the design system that names nothing it has: a typo, or a guess. */
export const unknownToken: CssRule = {
  id: "unknown-token",
  description: "A custom property of the design system's prefixes that is none of its tokens.",
  check({ value, line, column, valueStart }, { docs, report }) {
    const index = indexOf(docs);
    for (const name of varsIn(value)) {
      if (index.names.has(name) || !index.prefixes.some((prefix) => name.startsWith(prefix))) {
        continue;
      }
      // The tokens of the nearest group that exists: `--u-color-text-…`.
      let group = name;
      let siblings: string[] = [];
      while (siblings.length === 0 && group.includes("-", 3)) {
        group = group.slice(0, group.lastIndexOf("-"));
        siblings = [...index.names].filter((other) => other.startsWith(`${group}-`));
      }
      const hint =
        siblings.length > 0 && group.length > 4
          ? ` Its group has ${siblings
              .slice(0, 8)
              .map((other) => `\`${other}\``)
              .join(", ")}${siblings.length > 8 ? ` (${siblings.length} in all)` : ""}.`
          : "";
      // Its likely name, a suggestion the check never applies (ADR 0047).
      const meant = spellingSuggestion(name, index.names);
      const nameAt = value.indexOf(name);
      report({
        severity: "error",
        message: `${docs.name} has no token \`${name}\`.${meant ? ` Did you mean \`${meant}\`?` : ""}${hint}`,
        line,
        column,
        ...(meant && valueStart !== undefined
          ? {
              suggestions: [
                {
                  description: `Replace with ${meant}`,
                  edits: [
                    {
                      start: valueStart + nameAt,
                      end: valueStart + nameAt + name.length,
                      text: meant,
                    },
                  ],
                },
              ],
            }
          : {}),
      });
    }
  },
};

/** A primitive where an intent fits: it ignores the themes the semantic tokens follow. */
export const primitiveToken: CssRule = {
  id: "primitive-token",
  description: "A primitive token read by an application: a semantic token names the intent.",
  check(declaration, { docs, report }) {
    const { value, line, column } = declaration;
    const index = indexOf(docs);
    for (const name of varsIn(value)) {
      const token = index.byName.get(name);
      if (token?.level !== "primitive") {
        continue;
      }
      const semantic = docs.tokens.filter(
        (other) =>
          other.level === "semantic" &&
          (other.aliasChain.includes(token.id) ||
            Object.values(other.contexts).some(({ aliasChain }) => aliasChain.includes(token.id))),
      );
      report({
        severity: "warning",
        message: `\`${name}\` is a primitive: use the semantic token of the intent${
          semantic.length > 0 ? `, ${vars(semantic.slice(0, 4))}` : ""
        }.`,
        line,
        column,
        // One intent only: the fix names it. The value changes in the
        // contexts the semantic token follows: unsafe.
        ...(semantic.length === 1
          ? fixAt(
              declaration,
              value.indexOf(name, value.indexOf("var(")),
              name.length,
              semantic[0]!.name,
              false,
            )
          : {}),
      });
    }
  },
};

/** A property and the semantic groups whose tokens it takes, value by value. */
interface Family {
  readonly property: RegExp;
  readonly groups: readonly string[];
  /** Whether the tokens hold the whole value (a shadow, a font stack), not one part. */
  readonly whole?: boolean;
}

const FAMILIES: readonly Family[] = [
  {
    property:
      /^((margin|padding)(-(top|right|bottom|left|block|inline)(-(start|end))?)?|(row-|column-)?gap|inset(-(block|inline)(-(start|end))?)?|top|right|bottom|left)$/,
    groups: ["spacing"],
  },
  {
    property: /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/,
    groups: ["radius"],
  },
  { property: /^font-size$/, groups: ["font.size"] },
  { property: /^font-weight$/, groups: ["font.weight"] },
  { property: /^line-height$/, groups: ["font.line-height"] },
  { property: /^font-family$/, groups: ["font.family"], whole: true },
  {
    property: /^(border(-(top|right|bottom|left|block|inline))?|outline)(-width)?$/,
    groups: ["border", "focus-ring"],
  },
  { property: /^(transition|animation)(-duration)?$/, groups: ["motion.duration"] },
  { property: /^(transition|animation)(-timing-function)?$/, groups: ["motion.easing"] },
  { property: /^box-shadow$/, groups: ["shadow"], whole: true },
  // A text style (ADR 0051): the whole `font` shorthand.
  { property: /^font$/, groups: ["text"], whole: true },
];

/** The properties that take a color, alone or in a shorthand. */
const COLOR_PROPERTY =
  /^(color|background(-color)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|(box|text)-shadow|text-decoration(-color)?|caret-color|accent-color|column-rule(-color)?)$/;

/**
 * The role of a color property, and the tokens of that role: a text color
 * reads a `text` or `foreground` token, a background a `background` or
 * `surface` token.
 */
const ROLES: readonly [property: RegExp, tokens: RegExp][] = [
  [/^(color|caret-color|text-decoration(-color)?|fill|text-shadow)$/, /\.(text|foreground)\b/],
  [/^background(-color)?$/, /\.(background|surface|backdrop)\b/],
  [/^(border|outline|column-rule)/, /\.(border|focus-ring)\b|^color\.focus-ring$/],
];

/**
 * The entries of the tokens of the property's role, in their order: all of
 * them when the property has no role.
 */
function ofRole<T extends { token: TokenDoc }>(property: string, list: readonly T[]): T[] {
  const role = ROLES.find(([pattern]) => pattern.test(property))?.[1];
  return role ? list.filter(({ token }) => role.test(token.id)) : [...list];
}

/** A raw color in a value: hexadecimal, a color function, `white` or `black`. */
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)|\b(?:white|black)\b/gi;

/** A value with each `var(…)` blanked, at the same length: its fallback isn't checked. */
function withoutVars(value: string): string {
  let result = "";
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (depth === 0 && value.startsWith("var(", index)) {
      depth = 1;
      result += "    ";
      index += 3;
      continue;
    }
    if (depth > 0) {
      depth += value[index] === "(" ? 1 : value[index] === ")" ? -1 : 0;
      result += " ";
      continue;
    }
    result += value[index];
  }
  return result;
}

/** A value in one form: spaces around commas and parentheses, quotes, units. */
const canonical = (value: string) =>
  normalizeValue(value.replace(/\s*([(),])\s*/g, "$1").replace(/'/g, '"'));

/** The parts of a value, outside its functions: `16px 24px`, `color 150ms ease`. */
function partsOf(value: string): { text: string; index: number }[] {
  const parts: { text: string; index: number }[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= value.length; index += 1) {
    const char = value[index] ?? " ";
    depth += char === "(" ? 1 : char === ")" ? -1 : 0;
    if (depth === 0 && /[\s,]/.test(char)) {
      if (index > start) {
        parts.push({ text: value.slice(start, index), index: start });
      }
      start = index + 1;
    }
  }
  return parts;
}

/** The semantic tokens of each family, by canonical value. */
const familyTokens = new WeakMap<DesignSystemDocs, Map<Family, Map<string, TokenDoc[]>>>();

function tokensOf(docs: DesignSystemDocs, family: Family): Map<string, TokenDoc[]> {
  let byFamily = familyTokens.get(docs);
  if (!byFamily) {
    familyTokens.set(docs, (byFamily = new Map()));
  }
  let byValue = byFamily.get(family);
  if (!byValue) {
    byValue = new Map();
    for (const token of docs.tokens) {
      if (
        token.level === "semantic" &&
        family.groups.some((group) => token.id === group || token.id.startsWith(`${group}.`))
      ) {
        const key = canonical(token.value);
        byValue.set(key, [...(byValue.get(key) ?? []), token]);
      }
    }
    byFamily.set(family, byValue);
  }
  return byValue;
}

/**
 * A raw value a semantic token holds: `padding: 16px`, `font-weight: 600`.
 * And any raw color, which doesn't follow the dark theme: the message gives
 * the token of the same color, or the nearest ones.
 */
export const rawValue: CssRule = {
  id: "raw-value",
  description:
    "A raw value that a semantic token holds, or a raw color: the token follows the themes, the value doesn't.",
  check(declaration, { docs, report }) {
    const { property, value, line, column } = declaration;
    if (property.startsWith("--")) {
      return;
    }
    const at = { severity: "warning" as const, line, column };
    let whole = false;
    for (const family of FAMILIES.filter(({ property: pattern }) => pattern.test(property))) {
      const tokens = tokensOf(docs, family);
      const candidates = family.whole ? [{ text: value, index: 0 }] : partsOf(value);
      for (const { text: part, index } of candidates) {
        if (part.includes("var(")) {
          continue;
        }
        const found = tokens.get(canonical(part));
        if (found) {
          whole ||= family.whole === true;
          // One token: the fix. Safe when the token has the same value in
          // every theme and motion; otherwise the page changes there.
          report({
            ...at,
            message: `\`${part}\` in ${property}: use ${vars(found)}.`,
            ...(found.length === 1
              ? fixAt(
                  declaration,
                  index,
                  part.length,
                  `var(${found[0]!.name})`,
                  !followsContext(found[0]!),
                )
              : {}),
          });
        }
      }
    }
    if (whole || !COLOR_PROPERTY.test(property)) {
      return;
    }
    const { colors } = indexOf(docs);
    // The fallback of a `var()` is the value when the token is missing: it
    // stays, like the backdrop a browser gives no token to.
    for (const { 0: literal, index } of withoutVars(value).matchAll(COLOR_LITERAL)) {
      const rgb = parseColor(literal);
      if (!rgb || colors.length === 0) {
        continue;
      }
      const ranked = colors
        .map(({ token, rgb: other }) => ({ token, distance: colorDistance(rgb, other) }))
        .sort((a, b) => a.distance - b.distance);
      // The tokens of the property's role: a text color reads a text token.
      const equal = ranked.filter(({ distance }) => distance < 0.05);
      const same = ofRole(property, equal).map(({ token }) => token);
      const role = ofRole(property, ranked);
      const nearest = (role.length > 0 ? role : ranked).slice(0, 3);
      const holders = equal.slice(0, 2).map(({ token }) => token);
      const otherUse =
        holders.length > 0
          ? ` ${vars(holders)} ${holders.length > 1 ? "hold" : "holds"} it, for another use.`
          : "";
      // One token of the role: the fix. A color token follows the theme:
      // the page changes in the dark theme, as intended, but not safely.
      report({
        ...at,
        ...(same.length === 1
          ? fixAt(declaration, index, literal.length, `var(${same[0]!.name})`, false)
          : {}),
        message:
          same.length > 0
            ? `\`${literal}\` in ${property}: use the token of its intent, ${vars(same.slice(0, 4))}.`
            : `\`${literal}\` in ${property}: a raw color doesn't follow the dark theme.${otherUse} Nearest tokens for ${property}: ${nearest
                .map(({ token, distance }) => `\`var(${token.name})\` (ΔE ${distance.toFixed(1)})`)
                .join(", ")}.`,
      });
    }
  },
};

/** The token a value reads, alone: `var(--u-color-action-text)`, a fallback allowed. */
const onlyToken = (docs: DesignSystemDocs, value: string) => {
  const name = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim())?.[1];
  return name ? indexOf(docs).byName.get(name) : undefined;
};

/** The properties of a color drawn on the background of its block. */
const ON_BACKGROUND =
  /^(color|border(-(top|right|bottom|left|block|inline))?-color|outline-color|fill|stroke)$/;

const LEVEL_WORDS: Record<string, string> = {
  must: "MUST",
  should: "SHOULD",
  "should-not": "SHOULD NOT",
  "must-not": "MUST NOT",
};

/**
 * A token on a background its pairs don't allow, in the same block (ADR
 * 0046): `color: var(--u-color-action-text)` on a surface. The contrast is
 * measured on the pairs only. A `must` pair gives an error, a `should` pair a
 * warning, like a usage rule.
 */
export const tokenPair: CssRule = {
  id: "token-pair",
  description: "A color token on a background token that its pairs don't allow, in one block.",
  check({ property, value, line, column, siblings = [] }, { docs, report }) {
    if (!ON_BACKGROUND.test(property)) {
      return;
    }
    const foreground = onlyToken(docs, value);
    const combos = foreground?.combos ?? [];
    if (!foreground || combos.length === 0) {
      return;
    }
    const background = siblings
      .filter(({ property: other }) => /^background(-color)?$/.test(other))
      .map(({ value: other }) => onlyToken(docs, other))
      .at(-1);
    if (!background) {
      return;
    }
    const allowed = combos.filter(({ level }) => level === "must" || level === "should");
    const denied = combos.find(
      ({ level, items }) =>
        (level === "must-not" || level === "should-not") && items.includes(background.id),
    );
    const missed =
      allowed.length > 0 && !allowed.some(({ items }) => items.includes(background.id));
    if (!denied && !missed) {
      return;
    }
    const combo = denied ?? allowed.find(({ level }) => level === "must") ?? allowed[0]!;
    const names = combo.items.map(
      (id) => `\`${docs.tokens.find((t) => t.id === id)?.name ?? id}\``,
    );
    report({
      severity: combo.level.startsWith("must") ? "error" : "warning",
      message: `\`${foreground.name}\` on \`${background.name}\`: it ${LEVEL_WORDS[combo.level]} be paired with ${names.join(", ")}.${combo.note ? ` ${combo.note}` : ""}`,
      line,
      column,
    });
  },
};

/** The rules of `check` on CSS. */
export const defaultCssRules: readonly CssRule[] = [
  unknownToken,
  primitiveToken,
  rawValue,
  tokenPair,
];

/** Options of `checkCss()`. */
export interface CssCheckOptions {
  readonly file?: string;
  /** The line of the CSS in its file: a `<style>` of a Vue component starts below its top. */
  readonly line?: number;
  /** The offset of the CSS in its file, for the fixes: where a `<style>` block starts. */
  readonly offset?: number;
  /** The column of the CSS in its first line: a `css` template of Lit starts after its backtick. */
  readonly column?: number;
  /** Where to report every problem: a `style` attribute, whose declarations have no line of their own. */
  readonly at?: { readonly line: number; readonly column: number };
  /** The rules: those of the docs by default. */
  readonly rules?: readonly CssRule[];
}

/**
 * Checks the use of the design system's tokens in CSS: a style sheet, a
 * `<style>` block, or the declarations of a `style` attribute.
 */
export function checkCss(
  docs: DesignSystemDocs,
  css: string,
  options: CssCheckOptions = {},
): Diagnostic[] {
  const { file, at } = options;
  const offset = (options.line ?? 1) - 1;
  const rules = options.rules ?? docs.cssRules;
  const diagnostics: Diagnostic[] = [];
  let root: Root;
  try {
    // A `style` attribute holds declarations only.
    root = postcss.parse(at ? `x{${css}}` : css);
  } catch (error) {
    if (!(error instanceof CssSyntaxError)) {
      throw error;
    }
    return [
      {
        rule: "css-syntax",
        severity: "error",
        message: `The CSS doesn't parse: ${error.reason}.`,
        ...(file ? { file } : {}),
        line: at?.line ?? (error.line ?? 1) + offset,
        column: at?.column ?? error.column ?? 1,
      },
    ];
  }
  root.walkDecls((node) => {
    // In forced colors, a sheet writes system colors and raw widths: no
    // token applies there.
    for (
      let parent: { type: string; params?: string; parent?: unknown } | undefined = node.parent;
      parent;
      parent = parent.parent as typeof parent
    ) {
      if (parent.type === "atrule" && /forced-colors\s*:\s*active/.test(parent.params ?? "")) {
        return;
      }
    }
    const start = node.source?.start?.offset;
    // A `style` attribute, or a value with a comment, isn't fixed in place.
    const fixable = !at && start !== undefined && node.raws.value === undefined;
    const siblings = (node.parent?.nodes ?? []).flatMap((other) =>
      other.type === "decl" ? [{ property: other.prop.toLowerCase(), value: other.value }] : [],
    );
    const declaration: CssDeclaration = {
      property: node.prop.startsWith("--") ? node.prop : node.prop.toLowerCase(),
      value: node.value,
      siblings,
      line: at?.line ?? (node.source?.start?.line ?? 1) + offset,
      column:
        at?.column ??
        (node.source?.start?.column ?? 1) +
          ((node.source?.start?.line ?? 1) === 1 ? (options.column ?? 1) - 1 : 0),
      ...(fixable
        ? {
            valueStart:
              (options.offset ?? 0) + start + node.prop.length + (node.raws.between ?? "").length,
          }
        : {}),
    };
    for (const rule of rules) {
      rule.check(declaration, {
        docs,
        report: (diagnostic) =>
          diagnostics.push({ ...diagnostic, rule: rule.id, ...(file ? { file } : {}) }),
      });
    }
  });
  return diagnostics;
}

/**
 * The `<style>` blocks of a Vue single-file component in CSS, with the line
 * each starts on. A block in another language (`lang="scss"`) isn't CSS.
 */
export function vueStyles(source: string): { css: string; line: number; offset: number }[] {
  return [...source.matchAll(/^<style(\s[^>]*)?>\r?\n?([\s\S]*?)^<\/style>/gm)].flatMap((match) => {
    const lang = /\blang\s*=\s*["']?([\w-]+)/.exec(match[1] ?? "")?.[1];
    if (lang !== undefined && lang !== "css") {
      return [];
    }
    const offset = match.index + match[0].indexOf(match[2]!);
    return [{ css: match[2]!, line: source.slice(0, offset).split("\n").length, offset }];
  });
}
