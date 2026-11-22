import { relative } from "node:path";
import type { Plugin, Resolver, ResolverInput, TokenNormalized } from "@terrazzo/parser";
import { transformCSSValue } from "@terrazzo/token-tools/css";
import {
  allDeclarations,
  baseSourcesDirectory,
  checkLevels,
  levels,
  PAGE_MODIFIERS,
  readResolver,
  type Declaration,
  type ResolverSources,
} from "./dtcg-sources.ts";
import { cssVariable, fontShorthand, resolverFileOf, type PrefixedGroup } from "./shared.ts";

export { brandResolver, type BrandResolverOptions } from "./dtcg-sources.ts";
export {
  tokenManifest,
  tokenManifestOf,
  type TokenManifest,
  type TokenManifestEntry,
  type TokenManifestModifier,
  type TokenManifestOptions,
} from "./token-manifest.ts";

/**
 * Terrazzo plugin: the base's DTCG tokens (or a brand's) as CSS custom
 * properties, the way the components read them (ADR 0002).
 *
 * Each build outputs the sheets it is given (ADR 0003): `@unicorne/tokens`
 * outputs the page sheet, `@unicorne/components` its components' sheets,
 * from the same resolver. A brand outputs both.
 *
 * - The page sheet (`page`), in the cascade layer `layer` (ADR 0013):
 *   - the base's primitives and semantic tokens on `:root` and on every
 *     `[data-brand]` container: a brand's container starts again from the
 *     base's values, not from those of a brand around it;
 *   - a brand's tokens (`brand`) on `[data-brand="<brand>"]`: the page of the
 *     brand sets the attribute on `<html>`, a page of another design system
 *     on a container;
 *   - the `theme` contexts on any `[data-theme]` element, and on the brand
 *     containers inside it: a dark zone in a light page, a light zone in a
 *     dark one. Without the attribute, `:root` follows
 *     `prefers-color-scheme`. The `motion: reduced` context under
 *     `prefers-reduced-motion: reduce`;
 *   - `color-scheme`, on the same triggers as the themes, when the sheet
 *     declares the dark theme: the browser's own UI (canvas, scrollbars, form
 *     controls) follows the theme.
 * - One sheet per component (`components`), adopted by its shadow root: its
 *   tokens on `:host`, then one `:host([attribute="context"])` rule per
 *   context of its modifiers.
 *
 * - The text styles (ADR 0051): a `typography` token is the value of the
 *   `font` shorthand, and the page sheet has a class per text style, in the
 *   layer `u.utilities`: `.u-text-heading-xl`, or `.acme-text-heading-xl` in
 *   a brand's sheet.
 *
 * Aliases stay `var()` references, so a value redefined on a container
 * cascades. `emit` limits the output to the tokens of some files: a brand
 * outputs its own, on top of the base's sheets (the default with `brand`). The build fails when the
 * tokens break the three-level rule (`checkLevels()`).
 *
 * The resolver is the only token source in the Terrazzo config.
 */
export interface TokensCssOptions {
  /** Custom property prefix: `u` gives `--u-color-action-background`. */
  prefix?: string;
  /** Cascade layer of the page sheet: `u.tokens.base`, or `u.tokens.brand` for a brand. Required with `page`. */
  layer?: string;
  /**
   * The brand of the page sheet: `acme` puts its tokens on
   * `[data-brand="acme"]`. Without it, the sheet is the base's.
   */
  brand?: string;
  /** The page sheet, relative to Terrazzo's `outDir`. Without it, no page sheet. */
  page?: string;
  /**
   * Component token group (`button`) → its sheet. Without it, no component
   * sheet, and the component tokens are left to another build: each group,
   * and each context of their modifiers, then needs no selector here.
   */
  components?: Record<string, ComponentSheet>;
  /**
   * Whether to output the tokens a file declares (absolute path). Default:
   * every file, or with `brand`, every file outside `@unicorne/tokens`.
   */
  emit?: (file: string) => boolean;
  /**
   * The prefix of the text style classes of the page sheet (ADR 0051):
   * `acme` gives `.acme-text-heading-xl`. Default: the brand, or `prefix`.
   */
  classPrefix?: string;
}

/** The layer of the classes of the page sheet: `u.utilities`, ordered by the base's `order.css`. */
const UTILITIES_LAYER = "u.utilities";

export interface ComponentSheet extends PrefixedGroup {
  /** The sheet, relative to Terrazzo's `outDir`. */
  file: string;
  /** Modifier → host attribute: `{ "button-variant": "variant" }` gives `:host([variant="danger"])`. */
  attributes?: Record<string, string>;
}

const NAME = "@unicorne/tokens:tokens-css";

export function tokensCss(options: TokensCssOptions): Plugin {
  let resolverFile: string | undefined;
  return {
    name: NAME,
    config(config) {
      resolverFile = resolverFileOf(config, NAME);
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
  const { prefix = "u", layer, brand, page } = options;
  if (page !== undefined && layer === undefined) {
    throw new Error(`${NAME}: set the cascade layer of the page sheet (option layer).`);
  }
  if (brand !== undefined && !/^[a-z][a-z0-9-]*$/.test(brand)) {
    throw new Error(`${NAME}: name the brand in lowercase letters, digits and hyphens.`);
  }
  const baseDirectory = brand === undefined ? undefined : baseSourcesDirectory();
  const emit =
    options.emit ??
    (baseDirectory === undefined ? () => true : (file) => !file.startsWith(baseDirectory));
  // Without the option, this build leaves the component tokens to another one.
  const ownsComponents = options.components !== undefined;
  const components = options.components ?? {};
  const errors = checkLevels(sources);
  const levelOf = levels(sources);
  const group = (id: string) => id.split(".")[0]!;
  const variable = (id: string) => cssVariable(id, prefix, components);

  // A build needs a selector for the tokens it outputs: a brand leaves the
  // base's components and variants to the base's sheets.
  const outputs = new Set(
    allDeclarations(sources)
      .filter(({ file }) => emit(file))
      .map(({ id }) => id),
  );
  const byVariable = new Map<string, string>();
  for (const id of levelOf.keys()) {
    const other = byVariable.get(variable(id));
    if (other !== undefined && other !== id) {
      errors.push(`${id} and ${other}: both give ${variable(id)}.`);
    }
    byVariable.set(variable(id), id);
    if (
      ownsComponents &&
      outputs.has(id) &&
      levelOf.get(id) === "component" &&
      !(group(id) in components)
    ) {
      errors.push(`${id}: no sheet for the component "${group(id)}" (option components).`);
    }
  }
  for (const [name, modifier] of sources.modifiers) {
    const pageContexts = PAGE_MODIFIERS[name];
    for (const [context, declarations] of modifier.contexts) {
      if (context === modifier.default || !declarations.some(({ file }) => emit(file))) {
        continue;
      }
      const mapped = pageContexts
        ? pageContexts.includes(context)
        : !ownsComponents || Object.values(components).some((sheet) => sheet.attributes?.[name]);
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
  const ids = (filter: (id: string) => boolean) =>
    ordered.filter((id) => outputs.has(id) && filter(id));
  const changedBy = (modifier: string, context: string) => {
    const declarations: Declaration[] =
      sources.modifiers.get(modifier)?.contexts.get(context) ?? [];
    const changed = new Set(declarations.map(({ id }) => id));
    return (id: string) => changed.has(id);
  };

  /** The CSS value of a token, its aliases as `var()`; a text style as its parts. */
  function cssValue(id: string, input: ResolverInput): string | Record<string, string> {
    const tokens = resolver.apply(input);
    return transformCSSValue(tokens[id] as TokenNormalized, {
      tokensSet: tokens,
      permutation: input,
      transformAlias: (token) => `var(${variable(token.id)})`,
      color: { legacyHex: true },
    }) as string | Record<string, string>;
  }

  function declarations(selected: string[], input: ResolverInput): string[] {
    return selected.map((id) => {
      const value = cssValue(id, input);
      if (typeof value === "string") {
        return `${variable(id)}: ${value};`;
      }
      // A text style (ADR 0051): the `font` shorthand.
      if (resolver.apply(input)[id]?.$type === "typography") {
        return `${variable(id)}: ${fontShorthand(value)};`;
      }
      throw new Error(`${NAME}: ${id} gives several CSS values; split it into tokens.`);
    });
  }

  /**
   * A class per text style, the base's and the brand's (ADR 0051): the
   * `font` shorthand of its token, and its letter spacing. Its `var()` are
   * resolved on the element, so a class follows the brand and the theme of
   * its zone.
   */
  function textClasses(classPrefix: string): string {
    const tokens = resolver.apply({});
    const styles = ordered.filter(
      (id) => levelOf.get(id) === "semantic" && tokens[id]?.$type === "typography",
    );
    return styles
      .map((id) => {
        const parts = cssValue(id, {}) as Record<string, string>;
        return rule(
          [`.${classPrefix}-${id.replaceAll(".", "-")}`],
          [
            `font: var(${variable(id)});`,
            `letter-spacing: ${parts["letter-spacing"] ?? "normal"};`,
          ],
        );
      })
      .join("\n\n");
  }

  const header = `/* Generated from ${relative(process.cwd(), sources.file)} by @unicorne/tokens/terrazzo-plugin (ADR 0002). Do not edit: change the tokens. */\n`;
  const files = new Map<string, string>();

  // --- The page sheet
  if (page !== undefined) {
    const selectors = pageSelectors(brand);
    const themeIds = ids(changedBy("theme", "dark"));
    const reducedIds = ids(changedBy("motion", "reduced"));
    const lightDeclarations = declarations(themeIds, { theme: "light" });
    const darkDeclarations = declarations(themeIds, { theme: "dark" });
    // Only the sheet that declares the dark theme sets `color-scheme`: a brand
    // keeps the base's themes and writes no dark value (ADR 0001).
    const declaresDark = (sources.modifiers.get("theme")?.contexts.get("dark") ?? []).some(
      ({ file }) => emit(file),
    );
    const colorScheme = declaresDark
      ? [
          rule([":root"], ["color-scheme: light dark;"]),
          rule(['[data-theme="light"]'], ["color-scheme: light;"]),
          rule(['[data-theme="dark"]'], ["color-scheme: dark;"]),
        ]
      : [];
    const pageRules = [
      rule(
        selectors.scope,
        declarations(
          ids((id) => levelOf.get(id) === "primitive"),
          {},
        ),
      ),
      rule(
        selectors.scope,
        declarations(
          ids((id) => levelOf.get(id) === "semantic"),
          {},
        ),
      ),
      ...colorScheme,
      // After the default values, which are the light theme's: a light zone
      // in a dark page declares them again.
      rule(selectors.zone("light"), lightDeclarations),
      atRule("@media (prefers-color-scheme: dark)", rule(selectors.systemDark, darkDeclarations)),
      rule(selectors.zone("dark"), darkDeclarations),
      atRule(
        "@media (prefers-reduced-motion: reduce)",
        rule(selectors.scope, declarations(reducedIds, { motion: "reduced" })),
      ),
    ].filter(Boolean);
    const classes = atRule(
      `@layer ${UTILITIES_LAYER}`,
      textClasses(options.classPrefix ?? brand ?? prefix),
    );
    if (pageRules.length > 0 || classes) {
      files.set(
        page,
        `${header}${[atRule(`@layer ${layer}`, pageRules.join("\n\n")), classes].filter(Boolean).join("\n\n")}\n`,
      );
    }
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

type Theme = "light" | "dark";

/**
 * The selectors of the page sheet (ADR 0013). A semantic token is a `var()`,
 * resolved on the element that declares it: each element whose brand or theme
 * differs from its parent's declares the tokens again.
 *
 * The theme of a brand container is that of its nearest `[data-theme]`
 * ancestor, through two levels: a brand in a light zone of a dark page is
 * light. Selectors can't tell which of three nested themes is the nearest.
 */
function pageSelectors(brand: string | undefined) {
  // The base: the page and every brand container. A brand: its containers,
  // the page among them (`<html data-brand="acme">`).
  const container = brand === undefined ? "[data-brand]" : `[data-brand="${brand}"]`;
  const other = (theme: Theme): Theme => (theme === "light" ? "dark" : "light");
  return {
    scope: brand === undefined ? [":root", container] : [container],
    /** An element with `data-theme`, and the brand containers that follow it. */
    zone: (theme: Theme) => [
      brand === undefined ? `[data-theme="${theme}"]` : `${container}[data-theme="${theme}"]`,
      `[data-theme="${theme}"] ${container}:not([data-theme]):not([data-theme="${theme}"] [data-theme="${other(theme)}"] *)`,
      // A brand's own value of a themed token, in a theme zone of its container.
      ...(brand === undefined
        ? []
        : [`${container} [data-theme="${theme}"]:not([data-brand], ${container} [data-brand] *)`]),
    ],
    /** The page that follows the system's preference, and its brand containers. */
    systemDark: [
      brand === undefined
        ? ':root:not([data-theme="light"])'
        : `${container}:root:not([data-theme="light"])`,
      `:root:not([data-theme="light"]) ${container}:not([data-theme]):not([data-theme="light"] *)`,
    ],
  };
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
