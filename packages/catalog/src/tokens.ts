import { readFile } from "node:fs/promises";
import type { DesignSystemDocs, TokenDoc, TokenLevel, TokenModifier, TokenValue } from "./model.ts";
import { colorDistance, parseColor } from "./colors.ts";
import { normalize } from "./query.ts";

/**
 * The tokens of a design system (ADR 0042), from its token manifest: the
 * `token-manifest.json` its Terrazzo build writes with `tokenManifest()` of
 * `@unicorne/tokens/terrazzo-plugin`. Every token, its custom property, its
 * level, its description, and its value in each context, aliases resolved.
 */

/** The token manifest, as `tokenManifest()` writes it. */
export interface TokenManifest {
  readonly schemaVersion: number;
  readonly modifiers: readonly TokenModifier[];
  readonly tokens: readonly (Omit<TokenDoc, "contexts"> & {
    readonly contexts?: Readonly<Record<string, TokenValue>>;
  })[];
}

/** The version of the manifest this catalog reads. */
const SCHEMA_VERSION = 1;

/** Reads a token manifest. Throws on a version this catalog doesn't read. */
export async function readTokenManifest(file: string): Promise<TokenManifest> {
  const manifest = JSON.parse(await readFile(file, "utf8")) as TokenManifest;
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `${file}: token manifest version ${manifest.schemaVersion}; this catalog reads version ${SCHEMA_VERSION}.`,
    );
  }
  return manifest;
}

/** The tokens of a manifest, each description through `rename`. */
export function tokensOfManifest(
  manifest: TokenManifest,
  rename: (text: string) => string = (text) => text,
): TokenDoc[] {
  return manifest.tokens.map(({ contexts, description, ...token }) => ({
    ...token,
    ...(description ? { description: rename(description) } : {}),
    contexts: contexts ?? {},
  }));
}

/**
 * A token by its ID or its custom property, in any of these forms:
 * `color.action.background`, `--u-color-action-background`,
 * `u-color-action-background`, `var(--u-color-action-background)`.
 */
export function findToken(docs: DesignSystemDocs, query: string): TokenDoc | undefined {
  const name = query
    .trim()
    .replace(/^var\(\s*([^,)]+)[^)]*\)$/, "$1")
    .trim();
  return docs.tokens.find(
    (token) => token.id === name || token.name === name || token.name === `--${name}`,
  );
}

/** Which tokens to list: a level, a group (an ID prefix, by segment), a DTCG type. */
export interface TokenFilter {
  readonly level?: TokenLevel;
  /** `color` gives `color.action.background`, not `colorful.x`. */
  readonly group?: string;
  readonly type?: string;
}

/** The tokens that pass every part of the filter, in the order of the docs. */
export function filterTokens(docs: DesignSystemDocs, filter: TokenFilter): TokenDoc[] {
  return docs.tokens.filter(
    (token) =>
      (!filter.level || token.level === filter.level) &&
      (!filter.group || token.id === filter.group || token.id.startsWith(`${filter.group}.`)) &&
      (!filter.type || token.type === filter.type),
  );
}

/** A token that `searchTokens()` found, with what matched. */
export interface TokenSearchResult {
  readonly token: TokenDoc;
  readonly score: number;
  /** What matched: `description`, or the context of a value, `value theme:dark`. */
  readonly matches: readonly string[];
}

/** A semantic token names an intent: the one an application should use. */
const LEVEL_RANK: Record<TokenLevel, number> = { semantic: 0, primitive: 1, component: 2 };
const LEVEL_BONUS: Record<TokenLevel, number> = { semantic: 3, primitive: 0, component: 1 };

/** A color in hexadecimal, a length, a duration or a number: a value, not words. */
const VALUE = /^(#[0-9a-f]{3,8}|-?\d*\.?\d+(px|rem|ms|s|%)?)$/i;

/**
 * A CSS value in one form, to compare two values: `#ABC` and `#aabbccff`
 * give `#aabbcc`, `1rem` gives `16px`, `0.15s` gives `150ms`.
 */
export function normalizeValue(value: string): string {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex !== undefined) {
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    return `#${full.length === 8 && full.endsWith("ff") ? full.slice(0, 6) : full}`;
  }
  const number = /^(-?\d*\.?\d+)(px|rem|ms|s)?$/.exec(text);
  if (number) {
    const [, amount, unit] = number;
    const scale = unit === "rem" ? 16 : unit === "s" ? 1000 : 1;
    const normalized = unit === "rem" ? "px" : unit === "s" ? "ms" : (unit ?? "");
    return `${Number((Number(amount) * scale).toFixed(4))}${normalized}`;
  }
  return text;
}

/** The parts of a composite value: `0px 12px 32px #0003` gives four. */
const partsOf = (value: string) =>
  value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(normalizeValue);

/**
 * The semantic colors nearest to a color no token holds, in OKLab (ADR
 * 0043): the nearest first, each with its distance.
 */
function nearestColors(docs: DesignSystemDocs, query: string): TokenSearchResult[] {
  const wanted = parseColor(query);
  if (!wanted) {
    return [];
  }
  return docs.tokens
    .filter(({ level, type }) => level === "semantic" && type === "color")
    .flatMap((token) => {
      const rgb = parseColor(token.value);
      return rgb ? [{ token, distance: colorDistance(wanted, rgb) }] : [];
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ token, distance }) => ({
      token,
      score: 0,
      matches: [`nearest color (ΔE ${distance.toFixed(1)})`],
    }));
}

/**
 * The tokens whose value, in any context, is `query` or holds it. A color
 * that no token holds finds the nearest semantic colors.
 */
function searchByValue(docs: DesignSystemDocs, query: string): TokenSearchResult[] {
  const wanted = normalizeValue(query);
  // A color matches whatever its syntax: `rgb(28, 101, 200)` is `#1c65c8`.
  const color = parseColor(query);
  const same = (value: string) => {
    if (normalizeValue(value) === wanted) {
      return true;
    }
    const other = color && parseColor(value);
    return other !== undefined && colorDistance(color!, other) < 0.05;
  };
  const results: TokenSearchResult[] = [];
  for (const token of docs.tokens) {
    const values: [label: string, value: string][] = [
      ["value", token.value],
      ...Object.entries(token.contexts).map(([context, { value }]): [string, string] => [
        `value ${context}`,
        value,
      ]),
    ];
    const whole = values.filter(([, value]) => same(value));
    const part = values.filter(
      ([, value]) => !same(value) && partsOf(value).some((piece) => same(piece)),
    );
    if (whole.length + part.length > 0) {
      results.push({
        token,
        score: whole.length > 0 ? 2 : 1,
        matches: [...whole, ...part].map(([label]) => label),
      });
    }
  }
  if (results.length === 0) {
    return nearestColors(docs, query);
  }
  // A semantic token first, then a whole value before a part of one.
  return results.sort(
    (a, b) =>
      LEVEL_RANK[a.token.level] - LEVEL_RANK[b.token.level] ||
      b.score - a.score ||
      Number(a.matches[0] !== "value") - Number(b.matches[0] !== "value"),
  );
}

/**
 * The tokens that `query` describes. A value (`#1c65c8`, `16px`, `150ms`)
 * finds the tokens that hold it, in any context: semantic tokens first. A
 * color no token holds finds the nearest semantic colors. Words
 * find the tokens whose ID, custom property or description hold each one,
 * semantic tokens first at equal match.
 */
export function searchTokens(
  docs: DesignSystemDocs,
  query: string,
  { limit = 10 }: { limit?: number } = {},
): TokenSearchResult[] {
  const trimmed = query.trim();
  if (parseColor(trimmed) || (VALUE.test(trimmed) && /[#.]|\d(px|rem|ms|s|%)$/i.test(trimmed))) {
    return searchByValue(docs, trimmed).slice(0, limit);
  }
  const words = normalize(trimmed).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const results: TokenSearchResult[] = [];
  for (const token of docs.tokens) {
    const fields: [weight: number, label: string, text: string][] = [
      [10, "name", `${token.id} ${token.name}`],
      [3, "description", token.description ?? ""],
      [2, "type", token.type],
    ];
    let score = LEVEL_BONUS[token.level];
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
      found += hit ? 1 : 0;
    }
    if (found === words.length) {
      results.push({ token, score, matches });
    }
  }
  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        LEVEL_RANK[a.token.level] - LEVEL_RANK[b.token.level] ||
        a.token.id.localeCompare(b.token.id),
    )
    .slice(0, limit);
}
