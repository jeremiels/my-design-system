import { resolve } from "node:path";
import { aliasOf, levels, readResolver, type ResolverSources } from "./dtcg-sources.ts";

/**
 * Custom Elements Manifest analyzer plugin: documents a component's tokens
 * from the DTCG tokens (ADR 0002), not from hand-written `@cssprop` tags.
 *
 * A class names its token group in its JSDoc, `@tokens button`; the plugin
 * adds each token of the group to its `cssProperties`, with its default value
 * (`var(--u-color-action-background)`) and its `$description`. Subclasses
 * inherit them, like any `@cssprop`. A brand documents only the tokens of its
 * own files (`emit`): its subclass inherits the others from the base's manifest.
 *
 * The options match those of `tokensCss()` (`my-design-system/terrazzo-plugin`).
 */
export interface TokensManifestOptions {
  /** The resolver, relative to the working directory: `tokens/u.resolver.json`. */
  resolver: string;
  /** Custom property prefix: `u` gives `--u-button-background-color`. */
  prefix?: string;
  /** Component token group → its prefix, when not `prefix`. */
  components?: Record<string, { prefix?: string }>;
  /** Whether to document the tokens a file declares (absolute path). Default: every file. */
  emit?: (file: string) => boolean;
}

export interface CssProperty {
  name: string;
  default: string;
  description?: string;
}

// The few TypeScript and manifest shapes the plugin reads.
interface JSDocTag {
  tagName: { text: string };
  comment?: string | readonly { text: string }[];
}
interface AnalyzePhase {
  ts: {
    isClassDeclaration(node: unknown): boolean;
    getJSDocTags(node: unknown): readonly JSDocTag[];
  };
  node: { name?: { text: string } };
  moduleDoc: { path: string; declarations?: { name: string; cssProperties?: CssProperty[] }[] };
}

export function tokensManifest(options: TokensManifestOptions) {
  const sources = readResolver(resolve(options.resolver));
  return {
    name: "my-design-system:tokens-manifest",
    analyzePhase({ ts, node, moduleDoc }: AnalyzePhase) {
      if (!ts.isClassDeclaration(node) || !node.name) {
        return;
      }
      const tag = ts.getJSDocTags(node).find(({ tagName }) => tagName.text === "tokens");
      if (!tag) {
        return;
      }
      const comment =
        typeof tag.comment === "string"
          ? tag.comment
          : (tag.comment ?? []).map(({ text }) => text).join("");
      const group = comment.trim().split(/\s/)[0] ?? "";
      const properties = componentCssProperties(sources, group, options);
      const declaration = moduleDoc.declarations?.find(({ name }) => name === node.name!.text);
      if (!declaration || properties.length === 0) {
        throw new Error(`${moduleDoc.path}: @tokens ${group} — no component token in this group.`);
      }
      declaration.cssProperties = properties;
    },
  };
}

/** The tokens of a component group, as manifest CSS properties, in file order. */
export function componentCssProperties(
  sources: ResolverSources,
  group: string,
  { prefix = "u", components = {}, emit = () => true }: Omit<TokensManifestOptions, "resolver">,
): CssProperty[] {
  const levelOf = levels(sources);
  const variable = (id: string) =>
    `--${components[id.split(".")[0]!]?.prefix ?? prefix}-${id.replaceAll(".", "-")}`;
  // The default value: the component set, then each modifier's default context.
  const defaults = [
    ...(sources.sets.get("component") ?? []),
    ...[...sources.modifiers.values()].flatMap(
      (modifier) => (modifier.default && modifier.contexts.get(modifier.default)) || [],
    ),
  ].filter(({ id }) => id.startsWith(`${group}.`) && levelOf.get(id) === "component");

  // A later declaration (a brand's) changes the default, and the description
  // if it has one.
  const properties = new Map<string, { value: unknown; description?: string }>();
  for (const { id, value, description } of defaults) {
    properties.set(id, { value, description: description ?? properties.get(id)?.description });
  }
  const emitted = new Set(defaults.filter(({ file }) => emit(file)).map(({ id }) => id));
  return [...properties]
    .filter(([id]) => emitted.has(id))
    .map(([id, { value, description }]) => {
      const alias = aliasOf(value);
      return {
        ...(description === undefined ? {} : { description }),
        name: variable(id),
        default: alias === undefined ? String(value) : `var(${variable(alias)})`,
      };
    });
}
