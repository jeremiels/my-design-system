import { LitElement, css, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type { Constructor } from "../types/common.ts";

export declare class DisabledInterface {
  disabled: boolean;
}

/**
 * Mixin: Adds disabled functionality
 */
export function withDisabled<T extends Constructor<LitElement>>(Base: T) {
  class DisabledElement extends Base {
    @property({ type: Boolean, reflect: true })
    disabled = false;

    static styles = [
      (Base as unknown as typeof LitElement).styles ?? [],
      css`
        :host([disabled]) {
          pointer-events: none;
          opacity: var(--opacity-disabled);
          cursor: not-allowed;
        }
      `,
    ];

    protected updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);

      if (changedProperties.has("disabled")) {
        if (this.disabled) {
          this.setAttribute("aria-disabled", "true");
        } else {
          this.removeAttribute("aria-disabled");
        }
      }
    }
  }
  return DisabledElement as Constructor<DisabledInterface> & T;
}
