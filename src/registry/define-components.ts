import type { DSBaseElement } from "../components/MyDSBaseElement.js";

type ComponentClass = typeof DSBaseElement;

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
}

const PREFIX = /^[a-z][a-z0-9]*$/;
const COMPONENT_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function nameOf(component: ComponentClass): string {
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
 * Every tag is checked before any is defined, so a failing call registers
 * nothing. Call it once per prefix.
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
}: DefineComponentsOptions): Readonly<Record<string, string>> {
  if (!PREFIX.test(prefix)) {
    throw new Error(
      `Invalid prefix ${JSON.stringify(prefix)}: use lowercase letters and digits, starting with a letter.`,
    );
  }

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

  const taken = Object.values(tagNames).filter((tag) => customElements.get(tag));
  if (taken.length > 0) {
    throw new Error(
      `Already defined: ${taken.map((tag) => `<${tag}>`).join(", ")}. ` +
        `Call defineComponents() once per prefix.`,
    );
  }

  for (const [name, component] of resolved) {
    customElements.define(
      tagNames[name],
      class extends component {
        static override tagNames = tagNames;
      },
    );
  }

  return tagNames;
}
