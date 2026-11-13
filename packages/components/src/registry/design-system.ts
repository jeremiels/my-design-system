import type { IconSet } from "@unicorne/icons";
import type { DSBaseElement } from "../components/base-element.js";
import { assertPrefix, defineComponents, nameOf } from "./define-components.js";

type ComponentClass = typeof DSBaseElement;

/**
 * A component class, or a function that loads it on demand:
 * `() => import("./acme-button.js").then((module) => module.AcmeButton)`.
 */
export type ComponentSource = ComponentClass | (() => Promise<ComponentClass>);

export interface DesignSystemOptions {
  /**
   * Tag prefix of the design system: `"acme"` registers `acme-button`.
   * Lowercase letters and digits, starting with a letter.
   */
  prefix: string;
  /**
   * The component names an application can register directly: part of the
   * base's catalog, plus the design system's own components
   * (`["button", "alert", "modal", "icon", "card"]`). Without it, every
   * component can be registered. The components a registered component
   * renders are registered with it, listed or not.
   */
  catalog?: readonly string[];
  /**
   * The design system's classes replacing base components, by component
   * name. Each must extend the class it replaces. Give a function to load
   * the class on demand: `define()` loads only the overrides of the
   * components it registers.
   */
  overrides?: Readonly<Record<string, ComponentSource>>;
  /**
   * Icons replacing or adding to the base's icons, by name (ADR 0005). Every
   * component of the design system that renders an icon renders these.
   */
  icons?: IconSet;
}

export interface DesignSystem {
  /** Tag prefix of the design system. */
  readonly prefix: string;
  /** The component names an application can register directly; `undefined`: all. */
  readonly catalog: readonly string[] | undefined;
  /**
   * Registers these components and the components they render, with the
   * design system's overrides and icons. Loads only the overrides they
   * need, so it is asynchronous: style `:not(:defined)` elements meanwhile.
   * Resolves with component name → tag name, once every tag is defined.
   */
  define(...components: ComponentClass[]): Promise<Readonly<Record<string, string>>>;
}

const isComponentClass = (source: unknown): source is ComponentClass =>
  typeof source === "function" &&
  typeof (source as Partial<ComponentClass>).componentName === "string";

/**
 * Declares a design system built on the base (ADR 0006): its tag prefix,
 * the part of the catalog it offers, the components it replaces and its
 * icons. Declaring it registers nothing, and imports no component: an
 * application registers what it uses with `define()`, and downloads only
 * that.
 *
 * @example
 * // @acme/design-system
 * export const acme = designSystem({
 *   prefix: "acme",
 *   catalog: ["button", "alert", "modal", "icon", "card"],
 *   overrides: {
 *     button: () => import("./acme-button.js").then((module) => module.AcmeButton),
 *   },
 *   icons: acmeIcons,
 * });
 *
 * // An application showing alerts only
 * import { acme, Alert } from "@acme/design-system";
 * await acme.define(Alert); // <acme-alert>, and the <acme-icon> it renders, with ACME's icons
 */
export function designSystem({
  prefix,
  catalog,
  overrides = {},
  icons,
}: DesignSystemOptions): DesignSystem {
  assertPrefix(prefix);
  const offered = catalog ? new Set(catalog) : undefined;

  const checkOverride = (name: string, override: unknown): ComponentClass => {
    if (!isComponentClass(override) || nameOf(override) !== name) {
      throw new Error(
        `overrides.${name} of ${prefix} must be, or load, a component class named "${name}": ` +
          `() => import("…").then((module) => module.Class).`,
      );
    }
    return override;
  };
  for (const [name, source] of Object.entries(overrides)) {
    if (isComponentClass(source)) {
      checkOverride(name, source);
    }
  }

  // Shared by every define() call: each loader runs once, and a component
  // is registered with the same class each time — a second registration of
  // the same classes is silent (defineComponents()).
  const loaded = new Map<string, Promise<ComponentClass>>();
  const withIcons = new WeakMap<ComponentClass, ComponentClass>();

  const load = (name: string, loader: () => Promise<ComponentClass>): Promise<ComponentClass> => {
    let loading = loaded.get(name);
    if (!loading) {
      const attempt = loader().then((override) => checkOverride(name, override));
      loading = attempt;
      loaded.set(name, attempt);
      // A failed load can be retried by a later define().
      attempt.catch(() => {
        if (loaded.get(name) === attempt) {
          loaded.delete(name);
        }
      });
    }
    return loading;
  };

  /** The icon component with the design system's icons over its own. */
  const iconsOn = (base: ComponentClass): ComponentClass => {
    let withSet = withIcons.get(base);
    if (!withSet) {
      const set: IconSet = { ...(base as ComponentClass & { icons?: IconSet }).icons, ...icons };
      withSet = class extends base {
        static icons = set;
      };
      withIcons.set(base, withSet);
    }
    return withSet;
  };

  /** The class the design system registers for `name`, `component` without an override. */
  const classFor = async (name: string, component: ComponentClass): Promise<ComponentClass> => {
    const source = Object.hasOwn(overrides, name) ? overrides[name] : undefined;
    let chosen = component;
    if (source) {
      chosen = isComponentClass(source) ? source : await load(name, source);
    }
    return name === "icon" && icons ? iconsOn(chosen) : chosen;
  };

  return {
    prefix,
    catalog,
    async define(...components) {
      if (components.length === 0) {
        throw new Error(`${prefix}: define() needs the components to register.`);
      }
      for (const component of components) {
        const name = nameOf(component);
        if (offered && !offered.has(name)) {
          // Not the class name: minified builds rename classes.
          throw new Error(
            `"${name}" isn't in the catalog of ${prefix}: ${[...offered].join(", ")}.`,
          );
        }
      }

      // The components to register and those they render, each with the
      // class of the design system: an override (loaded now) or the base's.
      const visited = new Map<string, Promise<void>>();
      const replaced: Record<string, ComponentClass> = {};
      const visit = (component: ComponentClass): Promise<void> => {
        const name = nameOf(component);
        let visiting = visited.get(name);
        if (!visiting) {
          visiting = classFor(name, component).then((chosen) => {
            if (chosen !== component) {
              replaced[name] = chosen;
            }
            return Promise.all(chosen.dependencies.map(visit)).then(() => undefined);
          });
          visited.set(name, visiting);
        }
        return visiting;
      };
      await Promise.all(components.map(visit));

      return defineComponents({ prefix, components, overrides: replaced });
    },
  };
}
