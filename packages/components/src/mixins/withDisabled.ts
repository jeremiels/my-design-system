import { LitElement, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import type { Constructor } from "../types/common.js";
import disabledStyles from "./withDisabled.css" with { type: "css" };

export declare class DisabledInterface {
  disabled: boolean;
  /**
   * Whether the element is disabled: its own `disabled`, or, for a
   * form-associated element, an ancestor `<fieldset disabled>`. Render and
   * ignore interactions from this, not from `disabled`.
   */
  protected get isDisabled(): boolean;
  /** @internal */
  formDisabledCallback(disabled: boolean): void;
}

/**
 * Mixin: Adds disabled functionality
 */
export function withDisabled<T extends Constructor<LitElement>>(Base: T) {
  class DisabledElement extends Base {
    /** Disables interaction; also sets `aria-disabled="true"` on the host. */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    /** The browser's disabled state of a form-associated element. */
    @state()
    private formDisabled = false;

    static styles = [(Base as unknown as typeof LitElement).styles ?? [], disabledStyles];

    protected get isDisabled(): boolean {
      return this.disabled || this.formDisabled;
    }

    /**
     * Called by the browser on form-associated elements
     * (`static formAssociated = true`) when their disabled state changes —
     * including through an ancestor `<fieldset disabled>`.
     * @internal
     */
    formDisabledCallback(disabled: boolean): void {
      this.formDisabled = disabled;
    }

    protected updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);

      if (changedProperties.has("disabled") || changedProperties.has("formDisabled")) {
        if (this.isDisabled) {
          this.setAttribute("aria-disabled", "true");
        } else {
          this.removeAttribute("aria-disabled");
        }
      }
    }
  }
  // Through `unknown`: protected members make the interface nominal.
  return DisabledElement as unknown as Constructor<DisabledInterface> & T;
}
