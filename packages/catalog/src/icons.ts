import { readFile } from "node:fs/promises";
import type { DesignSystemDocs, IconDoc } from "./model.ts";
import { normalize } from "./query.ts";

/**
 * The icons of a design system (ADR 0044), from its icon manifest: the
 * `icon-manifest.json` that `unicorne-icons --manifest` writes. Each icon, its
 * meaning and the words people search it by.
 */

/** The icon manifest, as `unicorne-icons` writes it. */
export interface IconManifest {
  readonly schemaVersion: number;
  readonly icons: readonly IconDoc[];
}

/** The version of the manifest this catalog reads. */
const SCHEMA_VERSION = 1;

/** Reads an icon manifest. Throws on a version this catalog doesn't read. */
export async function readIconManifest(file: string): Promise<IconManifest> {
  const manifest = JSON.parse(await readFile(file, "utf8")) as IconManifest;
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `${file}: icon manifest version ${manifest.schemaVersion}; this catalog reads version ${SCHEMA_VERSION}.`,
    );
  }
  return manifest;
}

/** The icons of a manifest, each description through `rename`. */
export function iconsOfManifest(
  manifest: IconManifest,
  rename: (text: string) => string = (text) => text,
): IconDoc[] {
  return manifest.icons.map(({ description, ...icon }) => ({
    ...icon,
    ...(description ? { description: rename(description) } : {}),
  }));
}

/**
 * The icons of a design system built on `base`: the base's, then its own. Its
 * icon replaces the base's of the same name, and keeps the base's metadata
 * it doesn't give.
 */
export function mergeIcons(base: readonly IconDoc[], own: readonly IconDoc[]): IconDoc[] {
  const byName = new Map(base.map((icon) => [icon.name, icon]));
  for (const icon of own) {
    const previous = byName.get(icon.name);
    byName.set(
      icon.name,
      previous
        ? {
            ...previous,
            ...(icon.description ? { description: icon.description } : {}),
            tags: icon.tags.length > 0 ? icon.tags : previous.tags,
            categories: icon.categories.length > 0 ? icon.categories : previous.categories,
            ...(previous.aliases || icon.aliases
              ? { aliases: [...(previous.aliases ?? []), ...(icon.aliases ?? [])] }
              : {}),
          }
        : icon,
    );
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** An icon by its name or one of its aliases, in any case. */
export function findIcon(docs: DesignSystemDocs, query: string): IconDoc | undefined {
  const name = query.trim().toLowerCase();
  return docs.icons.find(
    (icon) => icon.name === name || (icon.aliases ?? []).some((alias) => alias.name === name),
  );
}

/** An icon that `searchIcons()` found, with what matched. */
export interface IconSearchResult {
  readonly icon: IconDoc;
  readonly score: number;
  /** What matched: `tag cross`, `category status`, `description`. */
  readonly matches: readonly string[];
}

/**
 * The icons whose name, tags, categories or description hold every word of
 * `query`, without case nor accents: the name counts most. An empty query
 * gives every icon.
 */
export function searchIcons(
  docs: DesignSystemDocs,
  query: string,
  { limit = Infinity }: { limit?: number } = {},
): IconSearchResult[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const results: IconSearchResult[] = [];
  for (const icon of docs.icons) {
    const fields: [weight: number, label: string, text: string][] = [
      [10, "name", icon.name],
      ...icon.tags.map((tag): [number, string, string] => [5, `tag ${tag}`, tag]),
      ...(icon.aliases ?? []).map(({ name }): [number, string, string] => [
        5,
        `alias ${name}`,
        name,
      ]),
      ...icon.categories.map((category): [number, string, string] => [
        3,
        `category ${category}`,
        category,
      ]),
      [2, "description", icon.description ?? ""],
    ];
    let score = 0;
    let found = 0;
    const matches: string[] = [];
    for (const word of words) {
      let hit = false;
      for (const [weight, label, text] of fields) {
        if (normalize(text).includes(word)) {
          hit = true;
          score += weight;
          if (label !== "name" && !matches.includes(label)) {
            matches.push(label);
          }
        }
      }
      found += hit ? 1 : 0;
    }
    if (found === words.length) {
      results.push({ icon, score, matches });
    }
  }
  return results
    .sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name))
    .slice(0, limit);
}

/** The distance of two names, in edits: `stra` is 2 from `star`. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The icons an unknown name likely meant: the names a few edits away, then
 * those its words find (`cross` finds `close` by its tags).
 */
export function closeIcons(docs: DesignSystemDocs, name: string): IconDoc[] {
  const near = docs.icons
    .map((icon) => ({ icon, distance: editDistance(name, icon.name) }))
    .filter(({ distance }) => distance <= Math.max(2, Math.floor(name.length / 3)))
    .sort((a, b) => a.distance - b.distance)
    .map(({ icon }) => icon);
  const described = name
    .split("-")
    .flatMap((word) => searchIcons(docs, word).map(({ icon }) => icon));
  return [...new Set([...near, ...described])].slice(0, 5);
}
