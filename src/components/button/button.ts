import { html } from "lit";
import { property } from "lit/decorators.js";
import { withInternals } from "../../mixins/withInternals.js";
import { ButtonBase } from "./button-base.js";
import type { ButtonType } from "./button.type.js";

/**
 * A button that triggers an action, or submits or resets its form (`type`).
 *
 * @element u-button
 * @summary Triggers an action or submits a form.
 */
export class Button extends withInternals(ButtonBase) {
  static override componentName = "button";

  /**
   * Required for ElementInternals.form to resolve an ancestor <form> — a
   * shadow-rendered <button type="submit"> has no light-DOM form owner
   * otherwise, so type="submit"/"reset" would silently do nothing.
   */
  static formAssociated = true;

  /**
   * Button type.
   * @property {string} type - The type of the button.
   * @default "button"
   */
  @property({ type: String })
  type: ButtonType = "button";

  protected override handleClick(e: MouseEvent) {
    super.handleClick(e);
    if (this.isDisabled) {
      return;
    }

    if (this.type === "submit") {
      this.internals?.form?.requestSubmit();
    } else if (this.type === "reset") {
      this.internals?.form?.reset();
    }
  }

  render() {
    return html`
      <button
        part="button"
        class="button button--${this.size} button--${this.variant}"
        ?disabled=${this.isDisabled}
        type=${this.type}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}
