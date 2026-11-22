import type { ComponentDoc, Member } from "./model.ts";

// The few shapes of a Custom Elements Manifest this module reads.
interface ManifestEntry {
  name: string;
  description?: string;
  summary?: string;
  type?: { text?: string };
  default?: string;
  fieldName?: string;
  attribute?: string;
  kind?: string;
  static?: boolean;
  privacy?: string;
}
interface ManifestDeclaration {
  kind?: string;
  name: string;
  tagName?: string;
  customElement?: boolean;
  summary?: string;
  description?: string;
  attributes?: ManifestEntry[];
  members?: ManifestEntry[];
  events?: ManifestEntry[];
  slots?: ManifestEntry[];
  cssParts?: ManifestEntry[];
  cssProperties?: ManifestEntry[];
}
/** A Custom Elements Manifest, as `custom-elements.json` holds it. */
export interface CustomElementsManifest {
  modules: { declarations?: ManifestDeclaration[] }[];
}

/** The values of a union of strings: `"a" | "b" | undefined` gives `a` and `b`. */
export function valuesOf(type: string | undefined): readonly string[] | undefined {
  if (!type) {
    return undefined;
  }
  const parts = type.split("|").map((part) => part.trim());
  const strings = parts.filter((part) => /^"[^"]*"$/.test(part));
  const rest = parts.filter((part) => !/^"[^"]*"$/.test(part) && part !== "undefined");
  return strings.length > 0 && rest.length === 0
    ? strings.map((part) => JSON.parse(part) as string)
    : undefined;
}

const text = (value: string | undefined) => (value ?? "").trim();

/** A member without its empty fields. */
function member(entry: Partial<Member> & { name: string }): Member {
  return Object.fromEntries(
    Object.entries(entry).filter(
      ([key, value]) => key === "name" || (value !== undefined && value !== ""),
    ),
  ) as unknown as Member;
}

/**
 * The components of a manifest whose tag has `prefix`: their API, without
 * usage rules. A member without a description, a private, protected or
 * static one, isn't part of the documented API.
 */
export function componentsOfManifest(
  manifest: CustomElementsManifest,
  prefix: string,
): ComponentDoc[] {
  const components: ComponentDoc[] = [];
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      const tag = declaration.tagName;
      if (!declaration.customElement || !tag?.startsWith(`${prefix}-`)) {
        continue;
      }
      const documented = (entry: ManifestEntry) =>
        Boolean(entry.description) && !entry.static && !entry.privacy;
      const attributes = (declaration.attributes ?? []).filter(documented).map((entry) =>
        member({
          name: entry.name,
          type: entry.type?.text,
          description: text(entry.description),
          default: entry.default,
          property: entry.fieldName,
          values: valuesOf(entry.type?.text),
        }),
      );
      const withAttribute = new Set(
        (declaration.attributes ?? []).map((entry) => entry.fieldName).filter(Boolean),
      );
      const fields = (declaration.members ?? []).filter(documented);
      components.push({
        name: tag.slice(prefix.length + 1),
        tag,
        className: declaration.name,
        summary: text(declaration.summary),
        description: text(declaration.description),
        attributes,
        properties: fields
          .filter((entry) => entry.kind === "field" && !withAttribute.has(entry.name))
          .map((entry) =>
            member({
              name: entry.name,
              type: entry.type?.text,
              description: text(entry.description),
              default: entry.default,
              values: valuesOf(entry.type?.text),
            }),
          ),
        events: (declaration.events ?? [])
          .filter((entry) => entry.name)
          .map((entry) =>
            member({
              name: entry.name,
              type: entry.type?.text,
              description: text(entry.description),
            }),
          ),
        slots: (declaration.slots ?? []).map((entry) =>
          member({ name: entry.name, description: text(entry.description) }),
        ),
        parts: (declaration.cssParts ?? []).map((entry) =>
          member({ name: entry.name, description: text(entry.description) }),
        ),
        tokens: (declaration.cssProperties ?? []).map((entry) =>
          member({
            name: entry.name,
            description: text(entry.description),
            default: entry.default,
          }),
        ),
        methods: fields
          .filter((entry) => entry.kind === "method")
          .map((entry) => member({ name: entry.name, description: text(entry.description) })),
        guidelines: [],
      });
    }
  }
  return components.sort((a, b) => a.name.localeCompare(b.name));
}
