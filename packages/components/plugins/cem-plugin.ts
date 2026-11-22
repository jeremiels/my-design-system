import { resolve } from "node:path";
import { aliasOf, levels, readResolver, type ResolverSources } from "@unicorne/tokens/dtcg-sources";

/**
 * Custom Elements Manifest analyzer plugin: documents a component's tokens
 * from the DTCG tokens (ADR 0002), not from hand-written `@cssprop` tags.
 *
 * A class names its token groups in its JSDoc, `@tokens button`, one tag per group; the plugin
 * adds each token of the group to its `cssProperties`, with its default value
 * (`var(--u-color-action-background)`) and its `$description`. Subclasses
 * inherit them, like any `@cssprop`. A brand documents only the tokens of its
 * own files (`emit`): its subclass inherits the others from the base's manifest.
 *
 * The options match those of `tokensCss()` (`@unicorne/tokens/terrazzo-plugin`).
 */
export interface TokensManifestOptions {
  /** The resolver, absolute or relative to the working directory: `tokens/acme.resolver.json`. */
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
    name: "@unicorne/components:tokens-manifest",
    analyzePhase({ ts, node, moduleDoc }: AnalyzePhase) {
      if (!ts.isClassDeclaration(node) || !node.name) {
        return;
      }
      // One tag per group: `@tokens select` and `@tokens listbox`.
      const tags = ts.getJSDocTags(node).filter(({ tagName }) => tagName.text === "tokens");
      if (tags.length === 0) {
        return;
      }
      const declaration = moduleDoc.declarations?.find(({ name }) => name === node.name!.text);
      const properties = tags.flatMap((tag) => {
        const comment =
          typeof tag.comment === "string"
            ? tag.comment
            : (tag.comment ?? []).map(({ text }) => text).join("");
        const group = comment.trim().split(/\s/)[0] ?? "";
        const groupProperties = componentCssProperties(sources, group, options);
        if (!declaration || groupProperties.length === 0) {
          throw new Error(
            `${moduleDoc.path}: @tokens ${group} — no component token in this group.`,
          );
        }
        return groupProperties;
      });
      declaration!.cssProperties = properties;
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

// The few TypeScript shapes the type-alias plugin reads.
interface TypeNode {
  kind: number;
  types?: readonly TypeNode[];
  literal?: { kind: number; text?: string };
  typeName?: { text?: string };
}
interface AliasPhase {
  ts: {
    isTypeAliasDeclaration(node: unknown): boolean;
    isUnionTypeNode(node: unknown): boolean;
    isLiteralTypeNode(node: unknown): boolean;
    isStringLiteral(node: unknown): boolean;
    isTypeReferenceNode(node: unknown): boolean;
  };
  node: { name?: { text: string }; type?: TypeNode };
}
interface TypedEntry {
  type?: { text?: string };
}
interface LinkPhase {
  customElementsManifest: {
    modules: { declarations?: { attributes?: TypedEntry[]; members?: TypedEntry[] }[] }[];
  };
}

/**
 * Custom Elements Manifest analyzer plugin: writes the values of a union of
 * strings in place of its alias, `"primary" | "secondary"` for
 * `ButtonVariant`, in the types of attributes and fields (ADR 0039). The
 * documentation, its tools and Storybook's controls then know the values.
 * An alias of other aliases expands too; any other type stays as it is.
 */
export function typeAliasesManifest() {
  /** Alias name → its parts: a quoted string, or the name of another alias. */
  const aliases = new Map<string, string[]>();

  /** The text of a type with its aliases expanded, or `undefined` when none is known. */
  const expand = (text: string, seen = new Set<string>()): string[] | undefined => {
    let changed = false;
    const parts = text
      .split("|")
      .map((part) => part.trim())
      .flatMap((part) => {
        const alias = aliases.get(part);
        if (!alias || seen.has(part)) {
          return [part];
        }
        changed = true;
        return alias.flatMap((inner) => expand(inner, new Set([...seen, part])) ?? [inner]);
      });
    return changed ? [...new Set(parts)] : undefined;
  };

  return {
    name: "@unicorne/components:type-aliases",
    analyzePhase({ ts, node }: AliasPhase) {
      if (!ts.isTypeAliasDeclaration(node) || !node.name || !node.type) {
        return;
      }
      const members = ts.isUnionTypeNode(node.type) ? (node.type.types ?? []) : [node.type];
      const parts: string[] = [];
      for (const member of members) {
        if (ts.isLiteralTypeNode(member) && member.literal && ts.isStringLiteral(member.literal)) {
          parts.push(JSON.stringify(member.literal.text));
        } else if (ts.isTypeReferenceNode(member) && member.typeName?.text) {
          parts.push(member.typeName.text);
        } else {
          // Not a union of strings: its name says more than its parts.
          return;
        }
      }
      aliases.set(node.name.text, parts);
    },
    packageLinkPhase({ customElementsManifest }: LinkPhase) {
      for (const module of customElementsManifest.modules) {
        for (const declaration of module.declarations ?? []) {
          for (const entry of [...(declaration.attributes ?? []), ...(declaration.members ?? [])]) {
            const expanded = entry.type?.text ? expand(entry.type.text) : undefined;
            if (expanded) {
              // Only strings, and `undefined`: anything else keeps its alias.
              if (expanded.every((part) => part.startsWith('"') || part === "undefined")) {
                entry.type = { ...entry.type, text: expanded.join(" | ") };
              }
            }
          }
        }
      }
    },
  };
}
