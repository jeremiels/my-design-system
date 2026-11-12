import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, Resolver, ResolverInput, TokenNormalized } from "@terrazzo/parser";
import { transformCSSValue } from "@terrazzo/token-tools/css";
import {
  allDeclarations,
  checkLevels,
  levels,
  PAGE_MODIFIERS,
  readResolver,
  type Declaration,
  type ResolverSources,
} from "./dtcg-sources.ts";

/**
 * Terrazzo plugin: the base's DTCG tokens (or a brand's) as CSS custom
 * properties, the way the components read them (ADR 0002).
 *
 * - The page sheet (`page`), in the cascade layer `layer`:
 *   - primitives on `scope`;
 *   - semantic tokens on `scope`, and on every `[data-brand]` container when
 *     `scope` is `:root`: a container that redefines the primitives reaches
 *     them (ADR 0001, D4);
 *   - the `theme: dark` context under `prefers-color-scheme: dark` and on
 *     `:root[data-theme="dark"]`, the `motion: reduced` context under
 *     `prefers-reduced-motion: reduce`.
 * - One sheet per component (`components`), adopted by its shadow root: its
 *   tokens on `:host`, then one `:host([attribute="context"])` rule per
 *   context of its modifiers.
 *
 * Aliases stay `var()` references, so a value redefined on a container
 * cascades. `emit` limits the output to the tokens of some files: a brand
 * outputs its own, on top of the base's sheets. The build fails when the
 * tokens break the three-level rule (`checkLevels()`).
 *
 * The resolver is the only token source in the Terrazzo config.
 */
export interface TokensCssOptions {
  /** Custom property prefix: `u` gives `--u-color-action-background`. */
  prefix?: string;
  /** Cascade layer of the page sheet: `u.tokens.base`, or `u.tokens.brand` for a brand. */
  layer: string;
  /** The page sheet's root: `:root`, or `[data-brand="acme"]` for a theme scoped to a container. */
  scope?: string;
  /** The page sheet, relative to Terrazzo's `outDir`. */
  page: string;
  /** Component token group (`button`) → its sheet. */
  components?: Record<string, ComponentSheet>;
  /** Whether to output the tokens a file declares (absolute path). Default: every file. */
  emit?: (file: string) => boolean;
}

export interface ComponentSheet {
  /** The sheet, relative to Terrazzo's `outDir`. */
  file: string;
  /** Custom property prefix, when not `prefix`: `acme` for a brand's own component. */
  prefix?: string;
  /** Modifier → host attribute: `{ "button-variant": "variant" }` gives `:host([variant="danger"])`. */
  attributes?: Record<string, string>;
}

const NAME = "my-design-system:tokens-css";

export function tokensCss(options: TokensCssOptions): Plugin {
  let resolverFile: string | undefined;
  return {
    name: NAME,
    config(config) {
      const resolvers = config.tokens
        .map((url) => fileURLToPath(url))
        .filter((file) => file.endsWith(".resolver.json"));
      if (resolvers.length !== 1 || config.tokens.length !== 1) {
        throw new Error(`${NAME}: set the resolver (*.resolver.json) as the only token source.`);
      }
      resolverFile = resolvers[0];
    },
    build({ resolver, outputFile }) {
      for (const [file, css] of tokensCssFiles(readResolver(resolverFile!), resolver, options)) {
        outputFile(file, css);
      }
    },
  };
}

/** The CSS sheets to write, by file name. Throws on a token that breaks a rule. */
export function tokensCssFiles(
  sources: ResolverSources,
  resolver: Resolver,
  options: TokensCssOptions,
): Map<string, string> {
  const {
    prefix = "u",
    layer,
    scope = ":root",
    page,
    components = {},
    emit = () => true,
  } = options;
  const errors = checkLevels(sources);
  const levelOf = levels(sources);
  const group = (id: string) => id.split(".")[0]!;
  const variable = (id: string) =>
    `--${components[group(id)]?.prefix ?? prefix}-${id.replaceAll(".", "-")}`;

  const byVariable = new Map<string, string>();
  for (const id of levelOf.keys()) {
    const other = byVariable.get(variable(id));
    if (other !== undefined && other !== id) {
      errors.push(`${id} and ${other}: both give ${variable(id)}.`);
    }
    byVariable.set(variable(id), id);
    if (levelOf.get(id) === "component" && !(group(id) in components)) {
      errors.push(`${id}: no sheet for the component "${group(id)}" (option components).`);
    }
  }
  for (const [name, modifier] of sources.modifiers) {
    const pageContexts = PAGE_MODIFIERS[name];
    for (const context of modifier.contexts.keys()) {
      if (context === modifier.default) {
        continue;
      }
      const mapped = pageContexts
        ? pageContexts.includes(context)
        : Object.values(components).some((sheet) => sheet.attributes?.[name]);
      if (!mapped) {
        errors.push(`Context "${name}: ${context}" has no selector.`);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`${NAME}: the tokens break the rules (ADR 0002).\n- ${errors.join("\n- ")}`);
  }

  // The output follows the order of the files.
  const ordered = [...new Set(allDeclarations(sources).map(({ id }) => id))];
  const emitted = new Set(
    allDeclarations(sources)
      .filter(({ file }) => emit(file))
      .map(({ id }) => id),
  );
  const ids = (filter: (id: string) => boolean) =>
    ordered.filter((id) => emitted.has(id) && filter(id));
  const changedBy = (modifier: string, context: string) => {
    const declarations: Declaration[] =
      sources.modifiers.get(modifier)?.contexts.get(context) ?? [];
    const changed = new Set(declarations.map(({ id }) => id));
    return (id: string) => changed.has(id);
  };

  function declarations(selected: string[], input: ResolverInput): string[] {
    const tokens = resolver.apply(input);
    return selected.map((id) => {
      const value = transformCSSValue(tokens[id] as TokenNormalized, {
        tokensSet: tokens,
        permutation: input,
        transformAlias: (token) => `var(${variable(token.id)})`,
        color: { legacyHex: true },
      });
      if (typeof value !== "string") {
        throw new Error(`${NAME}: ${id} gives several CSS values; split it into tokens.`);
      }
      return `${variable(id)}: ${value};`;
    });
  }

  const header = `/* Generated from ${relative(process.cwd(), sources.file)} by my-design-system/terrazzo-plugin (ADR 0002). Do not edit: change the tokens. */\n`;
  const files = new Map<string, string>();

  // --- The page sheet
  const semanticScope = scope === ":root" ? [":root", "[data-brand]"] : [scope];
  const themed = (theme: string) =>
    scope === ":root" ? [theme, `${theme} [data-brand]`] : [`${theme} ${scope}`];
  const darkIds = ids(changedBy("theme", "dark"));
  const reducedIds = ids(changedBy("motion", "reduced"));
  const darkDeclarations = declarations(darkIds, { theme: "dark" });
  const pageRules = [
    rule(
      [scope],
      declarations(
        ids((id) => levelOf.get(id) === "primitive"),
        {},
      ),
    ),
    rule(
      semanticScope,
      declarations(
        ids((id) => levelOf.get(id) === "semantic"),
        {},
      ),
    ),
    atRule(
      "@media (prefers-color-scheme: dark)",
      rule(themed(':root:not([data-theme="light"])'), darkDeclarations),
    ),
    rule(themed(':root[data-theme="dark"]'), darkDeclarations),
    atRule(
      "@media (prefers-reduced-motion: reduce)",
      rule(semanticScope, declarations(reducedIds, { motion: "reduced" })),
    ),
  ].filter(Boolean);
  if (pageRules.length > 0) {
    files.set(page, `${header}${atRule(`@layer ${layer}`, pageRules.join("\n\n"))}\n`);
  }

  // --- One sheet per component
  for (const [name, sheet] of Object.entries(components)) {
    const own = (id: string) => group(id) === name;
    const rules = [rule([":host"], declarations(ids(own), {}))];
    for (const [modifier, attribute] of Object.entries(sheet.attributes ?? {})) {
      const { default: fallback, contexts } = sources.modifiers.get(modifier) ?? {
        contexts: new Map(),
      };
      for (const context of contexts.keys()) {
        if (context !== fallback) {
          const changed = ids((id) => own(id) && changedBy(modifier, context)(id));
          rules.push(
            rule(
              [`:host([${attribute}="${context}"])`],
              declarations(changed, { [modifier]: context }),
            ),
          );
        }
      }
    }
    const css = rules.filter(Boolean).join("\n\n");
    if (css) {
      files.set(sheet.file, `${header}${css}\n`);
    }
  }
  return files;
}

const indent = (text: string) => text.replace(/^(?=.)/gm, "  ");

/** A rule, or "" when it has no declaration. */
function rule(selectors: string[], declarations: string[]): string {
  return declarations.length === 0
    ? ""
    : `${selectors.join(",\n")} {\n${indent(declarations.join("\n"))}\n}`;
}

function atRule(prelude: string, body: string): string {
  return body ? `${prelude} {\n${indent(body)}\n}` : "";
}
