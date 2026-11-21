import type { DSBaseElement } from "../bases/base-element.js";
import { baseVersion } from "../version.js";

type ComponentClass = typeof DSBaseElement;
type Versions = NonNullable<ComponentClass["versions"]>;

export interface DefineComponentsOptions {
  /**
   * Tag prefix: each component is registered as `<prefix>-<componentName>`.
   * Lowercase letters and digits, starting with a letter (e.g. `"acme"`).
   */
  prefix: string;
  /**
   * Components to register — e.g. `allComponents`, plus a brand's own
   * components. Their `static dependencies` are registered too.
   */
  components: readonly ComponentClass[];
  /**
   * Brand subclasses replacing catalog components, by component name
   * (`{ button: AcmeButton }`). Each must extend the class it replaces; every
   * component of this registration that renders `button` gets the override.
   */
  overrides?: Readonly<Record<string, ComponentClass>>;
  /**
   * The default value of some properties, by property name, for every
   * component of this registration that has the property: the texts of the
   * page's language (`{ closeLabel: "Fermer", errorLabel: "Erreur :" }`).
   * An attribute or a property set on an element still wins.
   */
  labels?: Readonly<Record<string, unknown>>;
  /**
   * The version of the design system that registers. It names the copy in
   * the warning of a second registration of the prefix.
   */
  version?: string;
}

const PREFIX = /^[a-z][a-z0-9]*$/;
const COMPONENT_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Throws for a prefix the registration functions refuse.
 * @internal Shared with `designSystem()`; not exported by the package.
 */
export function assertPrefix(prefix: string): void {
  if (!PREFIX.test(prefix)) {
    throw new Error(
      `Invalid prefix ${JSON.stringify(prefix)}: use lowercase letters and digits, starting with a letter.`,
    );
  }
}

/**
 * The component name of a class that can be registered; throws otherwise.
 * @internal Shared with `designSystem()`; not exported by the package.
 */
export function nameOf(component: ComponentClass): string {
  const name = component.componentName;
  if (!COMPONENT_NAME.test(name)) {
    throw new Error(
      `${component.name} can't be registered: its static componentName is ${JSON.stringify(name)}. ` +
        `Only concrete components set one (lowercase, e.g. "button-link").`,
    );
  }
  return name;
}

function extendsOrIs(candidate: ComponentClass, base: ComponentClass): boolean {
  return candidate === base || candidate.prototype instanceof base;
}

/**
 * Registers components under a tag prefix (ADR 0001, D1).
 *
 * Each component is registered as a fresh subclass: a constructor can only be
 * defined once, so the same catalog can be registered under several prefixes
 * on one page, and each subclass carries the tag names of its own
 * registration, which `tagFor()` uses to render dependencies (D2).
 *
 * Registering a prefix again doesn't break the page: a tag that a
 * registration of the design system already defined — an earlier call, a
 * module re-run by HMR, or another copy of the design system bundled by
 * another app on the page (micro-frontends) — keeps its definition, with a
 * console warning when it isn't (a subclass of) the class this call wanted.
 * The warning gives the versions of both copies (ADR 0012).
 * A tag defined by anything else is a conflict: the call throws, and since
 * every tag is checked first, registers nothing.
 *
 * @returns component name → registered tag name
 *
 * @example
 * class AcmeButton extends Button {
 *   static styles = [Button.styles, acmeButtonStyles];
 * }
 * defineComponents({
 *   prefix: "acme",
 *   components: [...allComponents, AcmeCard],
 *   overrides: { button: AcmeButton },
 * });
 * // <acme-button>, <acme-modal> (rendering <acme-button>), <acme-card>, …
 */
export function defineComponents({
  prefix,
  components,
  overrides = {},
  labels = {},
  version,
}: DefineComponentsOptions): Readonly<Record<string, string>> {
  assertPrefix(prefix);

  // Component name → class to register, dependencies included.
  const resolved = new Map<string, ComponentClass>();

  const visit = (component: ComponentClass, requiredBy: string): void => {
    const name = nameOf(component);
    const current = resolved.get(name);
    if (current) {
      if (!extendsOrIs(current, component)) {
        throw new Error(
          `"${name}" is already ${current.name}, which doesn't extend ${component.name} ` +
            `(required by ${requiredBy}). To replace a component, use overrides.`,
        );
      }
      return;
    }
    const chosen = overrides[name] ?? component;
    if (!extendsOrIs(chosen, component)) {
      throw new Error(`overrides.${name} (${chosen.name}) must extend ${component.name}.`);
    }
    resolved.set(name, chosen);
    for (const dependency of chosen.dependencies) {
      visit(dependency, `<${prefix}-${name}>`);
    }
  };

  for (const component of components) {
    visit(component, "components");
  }

  const unused = Object.keys(overrides).filter((name) => !resolved.has(name));
  if (unused.length > 0) {
    throw new Error(
      `overrides for unregistered components: ${unused.join(", ")} ` +
        `(registered: ${[...resolved.keys()].join(", ")}).`,
    );
  }

  const tagNames: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries([...resolved.keys()].map((name) => [name, `${prefix}-${name}`])),
  );

  const versions: Versions = Object.freeze({ base: baseVersion, designSystem: version });
  const describe = ({ base, designSystem }: Versions) =>
    designSystem === undefined ? `base ${base}` : `version ${designSystem}, base ${base}`;

  const conflicts: string[] = [];
  const kept: string[] = [];
  let keptVersions: Versions | undefined;
  const toDefine: [string, ComponentClass][] = [];
  for (const [name, component] of resolved) {
    const tag = tagNames[name];
    const existing = customElements.get(tag) as ComponentClass | undefined;
    if (!existing) {
      toDefine.push([tag, component]);
    } else if (existing.tagNames?.[name] !== tag) {
      // Not registered by defineComponents() (any copy of it).
      conflicts.push(`<${tag}>`);
    } else if (!(existing.prototype instanceof component)) {
      kept.push(`<${tag}>`);
      keptVersions ??= existing.versions;
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Already defined outside defineComponents(): ${conflicts.join(", ")}. ` +
        `Use another prefix.`,
    );
  }
  if (kept.length > 0) {
    // oxlint-disable-next-line no-console -- the page works, but not as asked
    console.warn(
      `defineComponents(): ${kept.join(", ")} already registered by another copy of the design system` +
        `${keptVersions ? ` (${describe(keptVersions)})` : ""}; keeping those definitions, ` +
        `not those of this copy (${describe(versions)}). Apps sharing a page should share one copy ` +
        `of the design system, or register theirs under their own prefix: withPrefix().`,
    );
  }

  for (const [tag, component] of toDefine) {
    // Among `labels`, the reactive properties of this component: reading
    // its attributes first makes Lit collect them.
    void component.observedAttributes;
    const defaults = Object.entries(labels).filter(([property]) =>
      component.elementProperties.has(property),
    );
    customElements.define(
      tag,
      class extends component {
        static override tagNames = tagNames;
        static override versions = versions;

        constructor() {
          super();
          // Before the attributes of the element and the properties a
          // framework sets: both still win.
          Object.assign(this, Object.fromEntries(defaults));
        }
      },
    );
  }

  return tagNames;
}
