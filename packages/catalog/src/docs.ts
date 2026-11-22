import type { UsageDocs } from "./dsds.ts";
import { componentsOfManifest, type CustomElementsManifest } from "./manifest.ts";
import type { ComponentDoc, DesignSystemDocs, Guideline, Internal, Member, Rule } from "./model.ts";
import { defaultRules } from "./check.ts";

/** The sources of a design system's documentation. */
export interface DocsSource {
  readonly name: string;
  /** The prefix of its tags: `u`. */
  readonly prefix: string;
  /** The package an application imports it from. */
  readonly package: string;
  readonly description?: string;
  readonly manifest: CustomElementsManifest;
  /** The usage of its components, from its DSDS documents: `readUsage()`. */
  readonly usage?: UsageDocs;
  /** The rules of `check`: `defaultRules` by default. */
  readonly rules?: readonly Rule[];
  /** The code that registers a component in an application. */
  readonly importCode?: (component: ComponentDoc) => string;
  /** Text a design system built on these docs leaves out, like references to ADRs. */
  readonly internal?: readonly Internal[];
}

/** The components of a manifest, with the usage of the DSDS documents. */
function withUsage(components: readonly ComponentDoc[], usage: UsageDocs | undefined) {
  return components.map((component) => {
    const doc = usage?.get(component.name);
    return doc
      ? {
          ...component,
          ...(doc.description ? { usage: doc.description } : {}),
          guidelines: [...component.guidelines, ...doc.guidelines],
        }
      : component;
  });
}

/** The documentation of a design system, from its manifest and its DSDS documents. */
export function createDocs(source: DocsSource): DesignSystemDocs {
  return {
    name: source.name,
    prefix: source.prefix,
    package: source.package,
    description: source.description ?? "",
    components: withUsage(componentsOfManifest(source.manifest, source.prefix), source.usage),
    rules: source.rules ?? defaultRules,
    importCode:
      source.importCode ??
      ((component) => `import { ${component.className} } from "${source.package}";`),
    internal: source.internal ?? [],
  };
}

/**
 * What a design system changes in the documentation of the one it extends,
 * the base's for instance. Its view says nothing of that one: tags, package
 * and references are its own.
 */
export interface DocsLayer {
  readonly name: string;
  /** The prefix of its tags: `acme`. */
  readonly prefix: string;
  /** The package its applications import: `@acme/design-system`. */
  readonly package: string;
  readonly description?: string;
  /** The components of the base it offers, by name. All by default. */
  readonly catalog?: readonly string[];
  /** Its own manifest: its components, and those it overrides, under its prefix. */
  readonly manifest?: CustomElementsManifest;
  /** Its own DSDS documents: their rules come after those of the base, their description wins. */
  readonly usage?: UsageDocs;
  /** The default values its `designSystem()` gives, by property name: its texts. */
  readonly labels?: Readonly<Record<string, unknown>>;
  /** Rules of `check` to add. */
  readonly rules?: readonly Rule[];
  /** Rules of the base to leave out, by `id`. */
  readonly withoutRules?: readonly string[];
  /** The code that registers a component in its applications. */
  readonly importCode?: (component: ComponentDoc) => string;
  /** Whether to keep the rules of the base's contributors. Its users don't apply them. */
  readonly keepContributorRules?: boolean;
  /** Text a design system built on this one leaves out. */
  readonly internal?: readonly Internal[];
}

/** Escapes a string for a regular expression. */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The text of the base, as the design system writes it: its tags, its
 * package, without the base's internal references. An event keeps its name:
 * `u-select` is the event of every design system, not the tag of `select`.
 */
function renamer(base: DesignSystemDocs, layer: DocsLayer): (text: string) => string {
  const events = new Set(base.components.flatMap(({ events }) => events.map(({ name }) => name)));
  const tags = base.components.map(({ tag }) => tag).filter((tag) => !events.has(tag));
  const tagPattern =
    tags.length > 0
      ? new RegExp(
          `(?<![\\w-])(${tags
            .sort((a, b) => b.length - a.length)
            .map(escape)
            .join("|")})(?![\\w-])`,
          "g",
        )
      : undefined;
  const basePackage = new RegExp(`${escape(base.package.replace(/\/.*$/, ""))}/[\\w-]+`, "g");
  return (text) => {
    let renamed = text;
    for (const internal of base.internal) {
      renamed = typeof internal === "function" ? internal(renamed) : renamed.replace(internal, "");
    }
    if (tagPattern) {
      renamed = renamed.replace(
        tagPattern,
        (tag) => `${layer.prefix}-${tag.slice(base.prefix.length + 1)}`,
      );
    }
    return renamed.replace(basePackage, layer.package);
  };
}

/** A member renamed, with the default the design system gives it. */
function renameMember(
  member: Member,
  rename: (text: string) => string,
  labels: Readonly<Record<string, unknown>> | undefined,
): Member {
  const label = labels?.[member.property ?? member.name];
  return {
    ...member,
    ...(member.description ? { description: rename(member.description) } : {}),
    ...(typeof label === "string" ? { default: JSON.stringify(label) } : {}),
  };
}

/** `base` with the members of `own` that have the same name replaced, and the others added. */
function mergeMembers(base: readonly Member[], own: readonly Member[]): Member[] {
  const names = new Set(own.map(({ name }) => name));
  return [...base.filter(({ name }) => !names.has(name)), ...own];
}

/**
 * The documentation of a design system built on `base`: the components of
 * its catalog, under its prefix, then its own components and overrides, and
 * the rules of its DSDS documents after those of the base.
 */
export function extendDocs(base: DesignSystemDocs, layer: DocsLayer): DesignSystemDocs {
  const rename = renamer(base, layer);
  const offered = layer.catalog ? new Set(layer.catalog) : undefined;
  const guideline = (rule: Guideline): Guideline => ({
    ...rule,
    statement: rename(rule.statement),
  });

  const inherited = base.components
    .filter(({ name }) => !offered || offered.has(name))
    .map((component): ComponentDoc => ({
      ...component,
      tag: `${layer.prefix}-${component.name}`,
      summary: rename(component.summary),
      description: rename(component.description),
      ...(component.usage ? { usage: rename(component.usage) } : {}),
      attributes: component.attributes.map((m) => renameMember(m, rename, layer.labels)),
      properties: component.properties.map((m) => renameMember(m, rename, layer.labels)),
      events: component.events.map((m) => renameMember(m, rename, undefined)),
      slots: component.slots.map((m) => renameMember(m, rename, undefined)),
      parts: component.parts.map((m) => renameMember(m, rename, undefined)),
      tokens: component.tokens.map((m) => renameMember(m, rename, undefined)),
      methods: component.methods.map((m) => renameMember(m, rename, undefined)),
      guidelines: component.guidelines
        .filter(({ scope }) => layer.keepContributorRules || scope === "users")
        .map(guideline),
    }));

  // Its own components, and those it overrides: their API wins, member by member.
  const own = withUsage(
    layer.manifest ? componentsOfManifest(layer.manifest, layer.prefix) : [],
    undefined,
  );
  const byName = new Map(inherited.map((component) => [component.name, component]));
  for (const component of own) {
    const overridden = byName.get(component.name);
    byName.set(
      component.name,
      overridden
        ? {
            // An override registers under the base's class: `acme.define(Button)`.
            ...overridden,
            summary: component.summary || overridden.summary,
            // What the base says, then what the design system adds.
            description: [overridden.description, component.description]
              .filter(Boolean)
              .join("\n\n"),
            attributes: mergeMembers(overridden.attributes, component.attributes),
            properties: mergeMembers(overridden.properties, component.properties),
            events: mergeMembers(overridden.events, component.events),
            slots: mergeMembers(overridden.slots, component.slots),
            parts: mergeMembers(overridden.parts, component.parts),
            tokens: mergeMembers(overridden.tokens, component.tokens),
            methods: mergeMembers(overridden.methods, component.methods),
          }
        : component,
    );
  }

  const components = [...byName.values()]
    .map((component) => {
      const doc = layer.usage?.get(component.name);
      return doc
        ? {
            ...component,
            ...(doc.description ? { usage: doc.description } : {}),
            guidelines: [...component.guidelines, ...doc.guidelines],
          }
        : component;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const without = new Set(layer.withoutRules ?? []);
  return {
    name: layer.name,
    prefix: layer.prefix,
    package: layer.package,
    description: layer.description ?? "",
    components,
    rules: [...base.rules.filter(({ id }) => !without.has(id)), ...(layer.rules ?? [])],
    importCode:
      layer.importCode ??
      ((component) => `import { ${component.className} } from "${layer.package}";`),
    internal: layer.internal ?? [],
  };
}
