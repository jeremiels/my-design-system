import { html } from "lit";
import { property } from "lit/decorators.js";
import { withInternals } from "../../mixins/withInternals.js";
import { ButtonBase } from "./button-base.js";
import type { MyButtonType } from "./button.type.js";

const InternalsButtonBase = withInternals(ButtonBase);

/**
 * A button component that can be used to trigger actions.
 *
 * @element my-button
 * @slot - The content of the button.
 * @csspart button - The button element.
 */
export class Button extends InternalsButtonBase {
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
  type: MyButtonType = "button";

  protected override handleClick(e: MouseEvent) {
    super.handleClick(e);
    if (this.disabled) {
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
        class="button button--${this.size} button--${this.variant}"
        ?disabled=${this.disabled}
        type=${this.type}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}
