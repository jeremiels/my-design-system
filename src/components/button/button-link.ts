import { html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { ButtonBase } from "./button-base.ts";

type LinkTarget = "_blank" | "_self" | "_parent" | "_top";

@customElement("my-button-link")
export class ButtonLink extends ButtonBase {
  /**
   * URL for the link when asLink is true.
   * @property {string} href - The URL the link points to.
   */
  @property({ type: String })
  href?: string;

  /**
   * Target attribute for the link.
   * @property {LinkTarget} target - Where to display the linked URL.
   * '_blank' - Opens in new window/tab
   * '_self' - Opens in same window/tab (default)
   * '_parent' - Opens in parent frame
   * '_top' - Opens in full window
   */
  @property({ type: String })
  target?: LinkTarget = "_self";

  /**
   * Compute rel attribute based on target
   * Add security-related attributes when target="_blank"
   */
  private get relAttribute(): string | undefined {
    return this.target === "_blank" ? "noopener noreferrer" : undefined;
  }

  static styles = [
    ButtonBase.styles,
    css`
      .button {
        text-decoration: none;
      }
    `,
  ];

  render() {
    return html`
      <a
        class="button button--${this.size} button--${this.variant}"
        href=${this.href ?? "#"}
        target=${ifDefined(this.target)}
        rel=${ifDefined(this.relAttribute)}
        role="button"
        @click=${this.handleClick}
      ><slot></slot></a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "my-button-link": ButtonLink;
  }
}
