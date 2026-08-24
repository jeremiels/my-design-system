import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ButtonBase } from "./button-base.js";
import type { MyButtonType } from "./button.type.js";

@customElement("my-button")
export class Button extends ButtonBase {
  /**
   * Required for ElementInternals.form to resolve an ancestor <form> — a
   * shadow-rendered <button type="submit"> has no light-DOM form owner
   * otherwise, so type="submit"/"reset" would silently do nothing.
   */
  static formAssociated = true;

  #internals: ElementInternals = this.attachInternals();

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
      this.#internals.form?.requestSubmit();
    } else if (this.type === "reset") {
      this.#internals.form?.reset();
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

declare global {
  interface HTMLElementTagNameMap {
    "my-button": Button;
  }
}
