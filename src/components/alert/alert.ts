import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SemanticVariant } from "../../types/common.ts";

@customElement("my-alert")
export class Alert extends LitElement {
  /**
   * Alert type.
   * @property {SemanticVariant} type - The type of the alert.
   * @default "information"
   */
  @property({ type: String })
  type: SemanticVariant = "information";

  /**
   * CSS Tokens (customize via CSS custom properties on `my-alert`):
   *
   * --my-alert-background-color  Background color (default: var(--color-information-bg))
   * --my-alert-text-color        Text color (default: var(--color-information-text))
   * --my-alert-padding           Internal padding (default: var(--spacing-md))
   * --my-alert-border-radius     Corner radius (default: var(--radius-md))
   * --my-alert-font-family       Font family (default: var(--font-family-base))
   *
   * @see src/docs/architecture/css-architecture.mdx for token conventions.
   */
  static styles = css`
    :host {
      --my-alert-background-color: var(--color-information-bg);
      --my-alert-text-color: var(--color-information-text);
      --my-alert-padding: var(--spacing-md);
      --my-alert-border-radius: var(--radius-md);
      --my-alert-font-family: var(--font-family-base);
    }

    .alert {
      padding: var(--my-alert-padding);
      border-radius: var(--my-alert-border-radius);
      font-family: var(--my-alert-font-family);
      color: var(--my-alert-text-color);
      background-color: var(--my-alert-background-color);
    }

    @media (forced-colors: active) {
      .alert {
        border: 1px solid CanvasText;
      }
    }

    .alert--success {
      --my-alert-background-color: var(--color-success-bg);
      --my-alert-text-color: var(--color-success-text);
    }
    .alert--warning {
      --my-alert-background-color: var(--color-warning-bg);
      --my-alert-text-color: var(--color-warning-text);
    }
    .alert--danger {
      --my-alert-background-color: var(--color-danger-bg);
      --my-alert-text-color: var(--color-danger-text);
    }
  `;

  /**
   * `danger`/`warning` interrupt immediately (role="alert", implicit
   * aria-live="assertive"); `success`/`information` are announced without
   * interrupting the user (role="status", implicit aria-live="polite").
   * See https://www.w3.org/WAI/ARIA/apg/patterns/alert/.
   */
  private get alertRole(): "alert" | "status" {
    return this.type === "danger" || this.type === "warning" ? "alert" : "status";
  }

  render() {
    return html`
      <div class="alert alert--${this.type}" role=${this.alertRole}>
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "my-alert": Alert;
  }
}
