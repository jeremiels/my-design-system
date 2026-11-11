import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../base-element.js";
import alertStyles from "./alert.css" with { type: "css" };
import type { AlertType } from "./alert.type.js";

/**
 * An alert component that displays a message to the user.
 *
 * @element u-alert
 * @summary Displays a message, announced to assistive technologies.
 * @slot - The content of the alert.
 * @csspart alert - The alert container.
 * @cssprop [--u-alert-background-color=var(--u-color-information-bg)] - Background color (types change the default).
 * @cssprop [--u-alert-text-color=var(--u-color-information-text)] - Text color (types change the default).
 * @cssprop [--u-alert-padding=var(--u-spacing-md)] - Internal padding.
 * @cssprop [--u-alert-border-radius=var(--u-radius-md)] - Corner radius.
 * @cssprop [--u-alert-font-family=var(--u-font-family-base)] - Font family.
 */
export class Alert extends DSBaseElement {
  static override componentName = "alert";

  /**
   * Alert type.
   * @property {AlertType} type - The type of the alert.
   * @default "information"
   */
  @property({ type: String })
  type: AlertType = "information";

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
      <div part="alert" class="alert alert--${this.type}" role=${this.alertRole}>
        <slot></slot>
      </div>
    `;
  }
}
