import { html } from "lit";
import { property } from "lit/decorators.js";
import { withInternals } from "../../mixins/withInternals.js";
import { withInvoker } from "../../mixins/withInvoker.js";
import { ButtonBase } from "./button-base.js";
import type { ButtonType } from "./button.type.js";

/**
 * A button that triggers an action, or submits or resets its form (`type`).
 * With `commandfor` and `command`, it controls another element without
 * script, like a native invoker button: it opens a `modal` with
 * `command="--show-modal"`.
 *
 * @element u-button
 * @summary Triggers an action or submits a form.
 */
export class Button extends withInvoker(withInternals(ButtonBase)) {
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

  /**
   * Value of the button. A `modal` closed by this button (`--close`,
   * `--request-close`) takes it as its `returnValue`.
   */
  @property({ type: String })
  value = "";

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
        class="button"
        ?disabled=${this.isDisabled}
        type=${this.type}
        value=${this.value}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}
