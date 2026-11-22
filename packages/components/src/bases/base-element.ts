import type { IconSet } from "@unicorne/icons";
import { LitElement, type CSSResultGroup } from "lit";
import { unsafeStatic, type StaticValue } from "lit/static-html.js";
import baseStyles from "./base-element.css" with { type: "css" };

/**
 * The settings of a design system that its component classes take
 * (`forDesignSystem()`): those of `designSystem()` that change a class
 * rather than a property.
 */
export interface DesignSystemSettings {
  /** Icons replacing or adding to the base's icons, by name (ADR 0005). */
  readonly icons?: IconSet;
  /** Other names of icons, adding to the base's: an old name → the icon it renders (ADR 0049). */
  readonly iconAliases?: Readonly<Record<string, string>>;
}

/**
 * Base class every component extends.
 *
 * Kept intentionally thin: universal resets/properties and the registration
 * contract only. Behavior that not every component needs (open/close, focus
 * delegation, form association, ...) belongs in a mixin from `src/mixins`.
 * Custom events are dispatched as typed `Event` subclasses from
 * `src/events`, not through a generic base-class `emit()` helper — see
 * `src/events/modal-close.ts` for the pattern.
 *
 * Classes never register themselves (ADR 0001, D1): `defineComponents()`
 * registers a subclass per prefix (`u-button`, `acme-button`, ...) and
 * hands it the tag names of its registration through `tagNames`.
 */
export class DSBaseElement extends LitElement {
  static styles: CSSResultGroup = [baseStyles];

  /**
   * Name of the component in the catalog, without any tag prefix: the
   * registered tag is `<prefix>-<componentName>`. Every concrete component
   * sets it; abstract bases (e.g. `ButtonBase`) don't.
   */
  static componentName = "";

  /**
   * Components this one renders (ADR 0001, D2): `defineComponents()`
   * registers them too, and `tagFor()` resolves their tag. Never hard-code
   * another component's tag in a template, nor create one with
   * `document.createElement` — a brand's override would be bypassed.
   */
  static dependencies: readonly (typeof DSBaseElement)[] = [];

  /**
   * Set by `defineComponents()` on the subclass it registers: component name
   * → tag name, for every component of that registration. Undefined on a
   * class nobody registered through `defineComponents()`.
   * @internal
   */
  static tagNames?: Readonly<Record<string, string>>;

  /**
   * Set by `defineComponents()` on the subclass it registers: the version of
   * the base, and that of the design system when it gives one (ADR 0012).
   * @internal
   */
  static versions?: Readonly<{ base: string; designSystem?: string }>;

  /**
   * The class a design system registers for this component, given its
   * settings: this class by default. A component that depends on a setting
   * returns a subclass that applies it, and leaves this class unchanged:
   * `Icon` returns a subclass with the design system's `icons` over its own.
   * `designSystem()` calls it once per class, after choosing the brand's
   * override, so the subclass extends the override.
   */
  static forDesignSystem<T extends typeof DSBaseElement>(
    this: T,
    _settings: DesignSystemSettings,
  ): T {
    return this;
  }

  /**
   * The language of the component, for `Intl`: the `lang` of its closest
   * ancestor, through the shadow roots, or the document's. `undefined` on a
   * server, and without any: `Intl` takes its default.
   */
  protected get language(): string | undefined {
    if (typeof document === "undefined") {
      return undefined;
    }
    let element: Element | null = this;
    while (element) {
      const holder: Element | null = element.closest("[lang]");
      if (holder) {
        return holder.getAttribute("lang") || undefined;
      }
      const root = element.getRootNode();
      element = root instanceof ShadowRoot ? root.host : null;
    }
    return document.documentElement.lang || undefined;
  }

  /**
   * The tag of a component declared in `static dependencies`, for templates
   * from `lit/static-html.js`: `` html`<${this.tagFor(Button)}>…</${…}>` ``.
   * It follows the registration of this element: `u-modal` renders
   * `u-button`, `acme-modal` renders `acme-button` — the brand's override
   * of `Button` if it has one.
   */
  protected tagFor(component: typeof DSBaseElement): StaticValue {
    const ctor = this.constructor as typeof DSBaseElement;
    if (!ctor.dependencies.includes(component)) {
      throw new Error(
        `<${this.localName}> renders ${component.name}, which is missing from its static dependencies.`,
      );
    }
    const tag = ctor.tagNames?.[component.componentName];
    if (!tag) {
      throw new Error(
        `<${this.localName}> has no tag for "${component.componentName}": ` +
          `register components with defineComponents(), not customElements.define().`,
      );
    }
    return unsafeStatic(tag);
  }
}
