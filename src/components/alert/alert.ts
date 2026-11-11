import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../MyDSBaseElement.js";
import alertStyles from "./alert.css" with { type: "css" };
import type { MyAlertType } from "./alert.type.js";

/**
 * An alert component that displays a message to the user.
 *
 * @element my-alert
 * @slot - The content of the alert.
 * @csspart alert - The alert element.
 */
export class Alert extends DSBaseElement {
  static override componentName = "alert";

  /**
   * Alert type.
   * @property {MyAlertType} type - The type of the alert.
   * @default "information"
   */
  @property({ type: String })
  type: MyAlertType = "information";

  /**
   * CSS Tokens (customize via CSS custom properties on `my-alert`):
   *
   * --u-alert-background-color  Background color (default: var(--u-color-information-bg))
   * --u-alert-text-color        Text color (default: var(--u-color-information-text))
   * --u-alert-padding           Internal padding (default: var(--u-spacing-md))
   * --u-alert-border-radius     Corner radius (default: var(--u-radius-md))
   * --u-alert-font-family       Font family (default: var(--u-font-family-base))
   *
   * @see src/docs/architecture/css-architecture.mdx for token conventions.
   */
  static styles = [DSBaseElement.styles ?? [], alertStyles];

  /**
   * `danger`/`warning` interrupt immediately (role="alert", implicit
   * aria-live="assertive"); `success`/`information` are announced without
   * interrupting the user (role="status", implicit aria-live="polite").
   * See https://www.w3.org/WAI/ARIA/apg/patterns/alert/.
   */
  private get alertRole(): "alert" | "status" {
    return this.type === "danger" || this.type === "warning"
      ? "alert"
      : "status";
  }

  render() {
    return html`
      <div class="alert alert--${this.type}" role=${this.alertRole}>
        <slot></slot>
      </div>
    `;
  }
}
