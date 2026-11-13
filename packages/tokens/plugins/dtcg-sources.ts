import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

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
 * semantic token; a component token aliases a semantic token and has a
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
      } else if (target !== undefined && target !== "semantic") {
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
