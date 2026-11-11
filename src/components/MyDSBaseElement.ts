import { LitElement, type CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import { unsafeStatic, type StaticValue } from "lit/static-html.js";
import baseStyles from "./MyDSBaseElement.css" with { type: "css" };

/**
 * Base class every component extends.
 *
 * Kept intentionally thin: universal resets/properties and the registration
 * contract only. Behavior that not every component needs (open/close, focus
 * delegation, form association, ...) belongs in a mixin from `src/mixins`.
 * Custom events are dispatched as typed `Event` subclasses from
 * `src/events`, not through a generic base-class `emit()` helper — see
 * `src/events/button-click.ts` for the pattern.
 *
 * Classes never register themselves (ADR 0001, D1): `defineComponents()`
 * registers a subclass per prefix (`my-button`, `acme-button`, ...) and
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
   * Reflected so `:dir()`/`:lang()` and locale-aware formatting work from
   * the host attribute without extra plumbing in every component.
   */
  @property() dir!: string;
  @property() lang!: string;

  /**
   * The tag of a component declared in `static dependencies`, for templates
   * from `lit/static-html.js`: `` html`<${this.tagFor(Button)}>…</${…}>` ``.
   * It follows the registration of this element: `my-modal` renders
   * `my-button`, `acme-modal` renders `acme-button` — the brand's override
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
