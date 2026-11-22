import type { Plugin, Resolver, ResolverInput, TokenNormalized } from "@terrazzo/parser";
import { transformCSSValue } from "@terrazzo/token-tools/css";
import {
  allDeclarations,
  checkLevels,
  levels,
  readResolver,
  type Level,
  type ResolverSources,
} from "./dtcg-sources.ts";
import { cssVariable, fontShorthand, resolverFileOf, type PrefixedGroup } from "./shared.ts";

/**
 * Terrazzo plugin: the token manifest of a design system (ADR 0042), what the
 * documentation tools read, like the Custom Elements Manifest for the
 * components. Every token of the resolver, the base's and a brand's: its
 * custom property, its level, its type, its description, its value resolved
 * to CSS in the default context, and the value of each context that changes
 * it (`theme: dark`, `button-variant: danger`).
 *
 * The manifest is JSON, written once per build: the base commits it, a
 * brand publishes it. The tools read it without Terrazzo.
 */
export interface TokenManifestOptions {
  /** The manifest, relative to Terrazzo's `outDir`: `../token-manifest.json`. */
  file: string;
  /** Custom property prefix: `u` gives `--u-color-action-background`. */
  prefix?: string;
  /** Component token group → its own prefix: `{ card: { prefix: "acme" } }`. */
  components?: Readonly<Record<string, PrefixedGroup>>;
  /** The prefix of the text style classes, as `tokensCss()` writes them: `acme`. Default: `prefix`. */
  classPrefix?: string;
}

/** The manifest, as written. `schemaVersion` changes with a breaking change of its shape. */
export interface TokenManifest {
  schemaVersion: 1;
  modifiers: TokenManifestModifier[];
  tokens: TokenManifestEntry[];
}

/** A modifier of the resolver: `theme`, with its contexts `light` and `dark`. */
export interface TokenManifestModifier {
  name: string;
  default?: string;
  contexts: string[];
}

/** A token of the manifest. */
export interface TokenManifestEntry {
  /** Its ID: `color.action.background`. */
  id: string;
  /** Its custom property: `--u-color-action-background`. */
  name: string;
  level: Level;
  /** Its DTCG `$type`: `color`, `dimension`. */
  type: string;
  /** Its ID without the last segment: `color.action`. */
  group: string;
  /** Its own description, or its group's. */
  description?: string;
  /** Its value in the default context, as CSS: `#1c65c8`. */
  value: string;
  /** The tokens it aliases, nearest first: `["palette.brand.600"]`. */
  aliasChain: string[];
  /** Each context that changes its value or its aliases, as `<modifier>:<context>`. */
  contexts?: Record<string, { value: string; aliasChain: string[] }>;
  /**
   * A text style's parts (ADR 0051): CSS property → the token it aliases,
   * `{ "font-size": "font.size.2xl" }`. Its `value` is the `font` shorthand.
   */
  parts?: Record<string, string>;
  /** A text style's class in the page sheet: `u-text-heading-xl`. */
  className?: string;
}

const NAME = "@unicorne/tokens:token-manifest";

export function tokenManifest(options: TokenManifestOptions): Plugin {
  let resolverFile: string | undefined;
  return {
    name: NAME,
    config(config) {
      resolverFile = resolverFileOf(config, NAME);
    },
    build({ resolver, outputFile }) {
      const manifest = tokenManifestOf(readResolver(resolverFile!), resolver, options);
      outputFile(options.file, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

/** The manifest of these sources. Throws on tokens that break the three-level rule. */
export function tokenManifestOf(
  sources: ResolverSources,
  resolver: Resolver,
  { prefix = "u", components = {}, classPrefix = prefix }: Omit<TokenManifestOptions, "file"> = {},
): TokenManifest {
  const errors = checkLevels(sources);
  if (errors.length > 0) {
    throw new Error(`${NAME}: the tokens break the rules (ADR 0002).\n- ${errors.join("\n- ")}`);
  }
  const levelOf = levels(sources);
  const declarations = allDeclarations(sources);
  // The manifest follows the order of the files, like the CSS.
  const ids = [...new Set(declarations.map(({ id }) => id))];

  // A later declaration (a brand's) changes the description if it has one;
  // without one, the token keeps the description it had. Read from the
  // files: Terrazzo shares one group description between files.
  const descriptions = new Map<string, { own?: string; group?: string }>();
  for (const { id, description, groupDescription } of declarations) {
    const previous = descriptions.get(id);
    descriptions.set(id, {
      own: description ?? previous?.own,
      group: groupDescription ?? previous?.group,
    });
  }

  const resolved = (input: ResolverInput) => {
    const tokens = resolver.apply(input);
    const cache = new Map<string, string>();
    // Each alias resolved to its value: the manifest holds no `var()`.
    const css = (id: string): string => {
      const cached = cache.get(id);
      if (cached !== undefined) {
        return cached;
      }
      const transformed = transformCSSValue(tokens[id] as TokenNormalized, {
        tokensSet: tokens,
        permutation: input,
        transformAlias: (token) => css(token.id),
        color: { legacyHex: true },
      }) as string | Record<string, string>;
      // A text style: the value of the `font` shorthand (ADR 0051).
      const value =
        typeof transformed === "string"
          ? transformed
          : tokens[id]?.$type === "typography"
            ? fontShorthand(transformed)
            : undefined;
      if (value === undefined) {
        throw new Error(`${NAME}: ${id} gives several CSS values; split it into tokens.`);
      }
      cache.set(id, value);
      return value;
    };
    return { css, aliasChain: (id: string) => tokens[id]?.aliasChain ?? [] };
  };

  const defaults = resolved({});
  const contexts = new Map<string, Record<string, { value: string; aliasChain: string[] }>>();
  for (const [name, modifier] of sources.modifiers) {
    for (const context of modifier.contexts.keys()) {
      if (context === modifier.default) {
        continue;
      }
      // Every token, not only those the context declares: an alias of a
      // token it changes changes too.
      const applied = resolved({ [name]: context });
      for (const id of ids) {
        const value = applied.css(id);
        const aliasChain = applied.aliasChain(id);
        if (
          value !== defaults.css(id) ||
          aliasChain.join(" ") !== defaults.aliasChain(id).join(" ")
        ) {
          contexts.set(id, {
            ...contexts.get(id),
            [`${name}:${context}`]: { value, aliasChain },
          });
        }
      }
    }
  }

  const tokens = resolver.apply({});
  const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const textStyle = (id: string) => ({
    parts: Object.fromEntries(
      Object.entries(tokens[id]?.partialAliasOf ?? {}).map(([part, alias]) => [
        kebab(part),
        String(alias),
      ]),
    ),
    className: `${classPrefix}-${id.replaceAll(".", "-")}`,
  });
  return {
    schemaVersion: 1,
    modifiers: [...sources.modifiers].map(([name, modifier]) => ({
      name,
      ...(modifier.default === undefined ? {} : { default: modifier.default }),
      contexts: [...modifier.contexts.keys()],
    })),
    tokens: ids.map((id): TokenManifestEntry => {
      const description = descriptions.get(id);
      return {
        id,
        name: cssVariable(id, prefix, components),
        level: levelOf.get(id)!,
        type: tokens[id]?.$type ?? "",
        group: id.split(".").slice(0, -1).join("."),
        ...(description?.own || description?.group
          ? { description: description.own ?? description.group }
          : {}),
        value: defaults.css(id),
        aliasChain: defaults.aliasChain(id),
        ...(contexts.has(id) ? { contexts: contexts.get(id) } : {}),
        ...(tokens[id]?.$type === "typography" ? textStyle(id) : {}),
      };
    }),
  };
}
