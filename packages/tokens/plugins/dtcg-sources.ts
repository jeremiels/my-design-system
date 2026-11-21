import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";

/**
 * Reads a DTCG resolver (`*.resolver.json`, DTCG 2025.10) and its token files
 * as written, before Terrazzo merges them: which file declares which token, in
 * which set or modifier context, with which raw `$value`. Terrazzo computes the
 * values; this tells the plugins where each token comes from:
 *
 * - its level, from the set that declares it (`primitive`, `semantic`,
 *   `component`), checked by `checkLevels()`;
 * - the selector of its value, from the modifier context that changes it;
 * - its file, so a brand outputs only the tokens of its own files.
 *
 * Supports `{ "$ref": "relative/file.json" }` sources and inline groups.
 */

/** A token as one file declares it. */
export interface Declaration {
  /** The token ID: `color.action.background`. */
  id: string;
  /** Absolute path of the file that declares it (the resolver, for an inline group). */
  file: string;
  /** The raw `$value`: an alias (`"{palette.brand.600}"`) or a literal. */
  value: unknown;
  description: string | undefined;
}

export interface Modifier {
  default: string | undefined;
  /** Context name → its declarations, in resolver order. */
  contexts: Map<string, Declaration[]>;
}

export interface ResolverSources {
  /** Absolute path of the resolver. */
  file: string;
  /** Set name → its declarations, in resolver order. */
  sets: Map<string, Declaration[]>;
  modifiers: Map<string, Modifier>;
}

export const LEVELS = ["primitive", "semantic", "component"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * The modifiers that change semantic tokens, and the selector of each of their
 * non-default contexts. Any other modifier changes component tokens.
 */
export const PAGE_MODIFIERS: Record<string, readonly string[]> = {
  theme: ["dark"],
  motion: ["reduced"],
};

/** `{palette.brand.600}` → `palette.brand.600`; anything else → undefined. */
export function aliasOf(value: unknown): string | undefined {
  return typeof value === "string" ? /^\{([^{}]+)\}$/.exec(value)?.[1] : undefined;
}

/** Every alias inside a value, composite values (a shadow's color) included. */
function nestedAliases(value: unknown): string[] {
  if (typeof value === "string") {
    return [...value.matchAll(/\{([^{}]+)\}/g)].map(([, id]) => id!);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(nestedAliases);
  }
  return [];
}

function collect(node: unknown, path: string[], file: string, into: Declaration[]): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return;
  }
  const record = node as Record<string, unknown>;
  if ("$value" in record) {
    const description = record.$description;
    into.push({
      id: path.join("."),
      file,
      value: record.$value,
      description: typeof description === "string" ? description : undefined,
    });
    return;
  }
  for (const [key, child] of Object.entries(record)) {
    if (!key.startsWith("$")) {
      collect(child, [...path, key], file, into);
    }
  }
}

function readSources(sources: unknown[], resolverFile: string): Declaration[] {
  const declarations: Declaration[] = [];
  for (const source of sources) {
    const ref = (source as { $ref?: unknown }).$ref;
    if (typeof ref === "string") {
      if (ref.includes("#")) {
        throw new Error(`${resolverFile}: "$ref": "${ref}" — reference a whole token file.`);
      }
      const file = resolve(dirname(resolverFile), ref);
      collect(JSON.parse(readFileSync(file, "utf8")), [], file, declarations);
    } else {
      collect(source, [], resolverFile, declarations);
    }
  }
  return declarations;
}

export function readResolver(file: string): ResolverSources {
  const document = JSON.parse(readFileSync(file, "utf8")) as {
    sets?: Record<string, { sources: unknown[] }>;
    modifiers?: Record<string, { default?: string; contexts: Record<string, unknown[]> }>;
  };
  const sets = new Map(
    Object.entries(document.sets ?? {}).map(([name, set]) => [
      name,
      readSources(set.sources, file),
    ]),
  );
  const modifiers = new Map(
    Object.entries(document.modifiers ?? {}).map(([name, modifier]) => [
      name,
      {
        default: modifier.default,
        contexts: new Map(
          Object.entries(modifier.contexts).map(([context, sources]) => [
            context,
            readSources(sources, file),
          ]),
        ),
      },
    ]),
  );
  return { file, sets, modifiers };
}

/** Every declaration, sets first, in resolver order. */
export function allDeclarations(sources: ResolverSources): Declaration[] {
  return [
    ...[...sources.sets.values()].flat(),
    ...[...sources.modifiers.values()].flatMap((modifier) =>
      [...modifier.contexts.values()].flat(),
    ),
  ];
}

/** The level of each token: its set, or `semantic`/`component` for a modifier's. */
export function levels(sources: ResolverSources): Map<string, Level> {
  const result = new Map<string, Level>();
  for (const [name, declarations] of sources.sets) {
    for (const { id } of declarations) {
      result.set(id, name as Level);
    }
  }
  for (const [name, modifier] of sources.modifiers) {
    for (const declarations of modifier.contexts.values()) {
      for (const { id } of declarations) {
        if (!result.has(id)) {
          result.set(id, name in PAGE_MODIFIERS ? "semantic" : "component");
        }
      }
    }
  }
  return result;
}

/**
 * The three-level rule, as error messages (none when the tokens follow it):
 * only primitives hold values; a semantic token aliases a primitive or another
 * semantic token; a component token aliases a semantic token, or a token
 * of its own component (an appearance reads the variant's color), and has a
 * description. Also: a token stays at one level, a context only changes tokens
 * that exist without it, and every theme declares the same tokens.
 */
export function checkLevels(sources: ResolverSources): string[] {
  const errors: string[] = [];
  const levelOf = levels(sources);
  const where = (declaration: Declaration) => `${declaration.id} (${declaration.file})`;

  for (const name of sources.sets.keys()) {
    if (!LEVELS.includes(name as Level)) {
      errors.push(`Set "${name}": name a set after its level (${LEVELS.join(", ")}).`);
    }
  }

  const declaredLevels = new Map<string, Set<string>>();
  for (const [name, declarations] of sources.sets) {
    for (const { id } of declarations) {
      declaredLevels.set(id, (declaredLevels.get(id) ?? new Set()).add(name));
    }
  }
  for (const [name, modifier] of sources.modifiers) {
    const level = name in PAGE_MODIFIERS ? "semantic" : "component";
    for (const declarations of modifier.contexts.values()) {
      for (const { id } of declarations) {
        declaredLevels.set(id, (declaredLevels.get(id) ?? new Set()).add(level));
      }
    }
  }
  for (const [id, names] of declaredLevels) {
    if (names.size > 1) {
      errors.push(`${id}: declared at several levels (${[...names].join(", ")}).`);
    }
  }

  for (const declaration of allDeclarations(sources)) {
    const level = levelOf.get(declaration.id);
    const alias = aliasOf(declaration.value);
    const target = alias === undefined ? undefined : levelOf.get(alias);
    if (level === "primitive") {
      if (alias !== undefined) {
        errors.push(`${where(declaration)}: a primitive holds a value, not an alias.`);
      }
      for (const nested of nestedAliases(declaration.value)) {
        if (levelOf.get(nested) !== "primitive") {
          errors.push(`${where(declaration)}: a primitive only references primitives.`);
        }
      }
    } else if (level === "semantic") {
      if (alias === undefined) {
        errors.push(`${where(declaration)}: a semantic token aliases a primitive, not a value.`);
      } else if (target === "component") {
        errors.push(`${where(declaration)}: a semantic token can't alias a component token.`);
      }
    } else if (level === "component") {
      if (alias === undefined) {
        errors.push(
          `${where(declaration)}: a component token aliases a semantic token, not a value.`,
        );
      } else if (target === "component" && alias.split(".")[0] !== declaration.id.split(".")[0]) {
        errors.push(
          `${where(declaration)}: a component token aliases a semantic token or a token of its own component, not one of another component.`,
        );
      } else if (target !== undefined && target !== "semantic" && target !== "component") {
        errors.push(
          `${where(declaration)}: a component token aliases a semantic token, not a ${target}.`,
        );
      }
    }
  }

  const component = sources.sets.get("component") ?? [];
  for (const id of new Set(component.map(({ id }) => id))) {
    if (!component.some((declaration) => declaration.id === id && declaration.description)) {
      errors.push(`${id}: a component token needs a $description (it documents the component).`);
    }
  }

  // A context changes the value of an existing token: its default (a set or
  // the modifier's default context) declares it too.
  const inSets = new Set([...sources.sets.values()].flat().map(({ id }) => id));
  for (const [name, modifier] of sources.modifiers) {
    const defaults = new Set(
      (modifier.default ? (modifier.contexts.get(modifier.default) ?? []) : []).map(({ id }) => id),
    );
    for (const [context, declarations] of modifier.contexts) {
      for (const declaration of declarations) {
        if (!inSets.has(declaration.id) && !defaults.has(declaration.id)) {
          errors.push(
            `${where(declaration)}: context "${name}: ${context}" changes a token that has no default value.`,
          );
        }
      }
    }
  }

  const theme = sources.modifiers.get("theme");
  if (theme) {
    const signature = (declarations: Declaration[]) =>
      [...new Set(declarations.map(({ id }) => id))].sort().join(" ");
    const [first, ...others] = [...theme.contexts];
    for (const [context, declarations] of others) {
      if (first && signature(declarations) !== signature(first[1])) {
        errors.push(`Themes "${first[0]}" and "${context}" don't declare the same tokens.`);
      }
    }
  }

  return [...new Set(errors)];
}

/** The base's resolver, `@unicorne/tokens/resolver.json`: absolute path. */
function baseResolverFile(): string {
  return createRequire(import.meta.url).resolve("@unicorne/tokens/resolver.json");
}

/** The directory of the base's token files: absolute path, with a trailing slash. */
export function baseSourcesDirectory(): string {
  return `${dirname(baseResolverFile())}/`;
}

export interface BrandResolverOptions {
  /** The brand: names the resolver, `.<name>.resolver.json`. */
  name: string;
  /**
   * The directory of the brand's token files, laid out as the base's:
   * `primitive/`, `semantic/`, `component/<component>/`.
   */
  sources: string;
  /**
   * The modifiers of the brand's own components, with their default context:
   * `{ "card-size": { default: "medium" } }` for
   * `component/card/size.small.tokens.json`.
   */
  modifiers?: Record<string, { default: string }>;
}

/** `*.tokens.json` files of a directory, sorted; none when it doesn't exist. */
function tokenFiles(directory: string): string[] {
  return existsSync(directory)
    ? readdirSync(directory)
        .filter((file) => file.endsWith(".tokens.json"))
        .sort()
        .map((file) => join(directory, file))
    : [];
}

/** `variant.danger.tokens.json` → `["variant", "danger"]`; `button.tokens.json` → undefined. */
function contextOf(file: string): [string, string] | undefined {
  const parts = basename(file, ".tokens.json").split(".");
  return parts.length === 2 ? [parts[0]!, parts[1]!] : undefined;
}

/**
 * Writes the resolver of a brand (ADR 0013, D5) and returns its path, for
 * `tokens` in the Terrazzo config: the base's sets and modifiers, with the
 * brand's files after the base's in each, so the brand's values win. The
 * brand never lists the base's files: a file the base adds is there.
 *
 * Where a file of `sources` goes:
 *
 * - `primitive/*.tokens.json`: the `primitive` set;
 * - `semantic/<name>.tokens.json`: the `semantic` set;
 * - `semantic/<modifier>.<context>.tokens.json`: that context of a page
 *   modifier (`theme.dark`, `motion.reduced`);
 * - `component/<component>/<component>.tokens.json`: the `component` set;
 * - `component/<component>/<attribute>.<value>.tokens.json`: the context
 *   `<value>` of the modifier `<component>-<attribute>`, the base's or one
 *   declared in `modifiers`.
 *
 * The resolver is written into `sources`, as `.<name>.resolver.json`: ignore
 * it in git, the build writes it.
 */
export function brandResolver({ name, sources, modifiers = {} }: BrandResolverOptions): string {
  const directory = resolve(sources);
  const output = join(directory, `.${name}.resolver.json`);
  const baseFile = baseResolverFile();
  const base = JSON.parse(readFileSync(baseFile, "utf8")) as {
    sets: Record<string, { sources: { $ref: string }[] }>;
    modifiers: Record<string, { default?: string; contexts: Record<string, { $ref: string }[]> }>;
    resolutionOrder: { $ref: string }[];
  };
  const ref = (file: string) => ({ $ref: relative(directory, file) });
  const fromBase = ({ $ref }: { $ref: string }) => ref(resolve(dirname(baseFile), $ref));

  const sets = Object.fromEntries(
    Object.entries(base.sets).map(([set, { sources: files }]) => [
      set,
      { sources: files.map(fromBase) },
    ]),
  );
  const contexts = Object.fromEntries(
    Object.entries(base.modifiers).map(([modifier, { default: fallback, contexts }]) => [
      modifier,
      {
        default: fallback,
        contexts: Object.fromEntries(
          Object.entries(contexts).map(([context, files]) => [context, files.map(fromBase)]),
        ),
      },
    ]),
  );
  for (const [modifier, { default: fallback }] of Object.entries(modifiers)) {
    contexts[modifier] ??= { default: fallback, contexts: { [fallback]: [] } };
  }
  const added: string[] = Object.keys(modifiers).filter(
    (modifier) => !(modifier in base.modifiers),
  );

  const place = (file: string, set: string, modifierOf: (attribute: string) => string) => {
    const context = contextOf(file);
    if (context === undefined) {
      sets[set]!.sources.push(ref(file));
      return;
    }
    const modifier = contexts[modifierOf(context[0])];
    if (modifier === undefined) {
      throw new Error(
        `${file}: no modifier "${modifierOf(context[0])}". Declare it in the modifiers option of brandResolver().`,
      );
    }
    (modifier.contexts[context[1]] ??= []).push(ref(file));
  };
  for (const file of tokenFiles(join(directory, "primitive"))) {
    sets.primitive!.sources.push(ref(file));
  }
  for (const file of tokenFiles(join(directory, "semantic"))) {
    place(file, "semantic", (attribute) => attribute);
  }
  const components = join(directory, "component");
  for (const component of existsSync(components) ? readdirSync(components).sort() : []) {
    for (const file of tokenFiles(join(components, component))) {
      place(file, "component", (attribute) => `${component}-${attribute}`);
    }
  }

  const document = {
    name,
    version: "2025.10",
    description: `Generated by brandResolver() of @unicorne/tokens: the base's tokens, then those of ${name}. Do not edit.`,
    sets,
    modifiers: contexts,
    resolutionOrder: [
      ...base.resolutionOrder,
      ...added.map((modifier) => ({ $ref: `#/modifiers/${modifier}` })),
    ],
  };
  mkdirSync(directory, { recursive: true });
  writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  return output;
}
