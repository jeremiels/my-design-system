import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ButtonBase } from "./button-base.ts";

@customElement("my-button")
export class Button extends ButtonBase {
  /**
   * Button type.
   * @property {string} type - The type of the button.
   * @default "button"
   */
  @property({ type: String })
  type: "button" | "submit" | "reset" = "button";

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
