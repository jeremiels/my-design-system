import { html, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { DSBaseElement } from "../base-element.js";
import alertStyles from "./alert.css" with { type: "css" };
import type { AlertType } from "./alert.type.js";

/**
 * How long the live region stays empty before the message is revealed: the
 * time screen readers need to register a new live region (Angular CDK's
 * LiveAnnouncer waits 100 ms for the same reason).
 */
const REVEAL_DELAY_MS = 100;

/**
 * An alert component that displays a message to the user.
 *
 * Its container is a live region (`role="status"` or `"alert"`, from
 * `type`). Screen readers announce what is added to a live region, not what
 * it already held when it appeared, so the message is revealed 100 ms after
 * the alert is first rendered: an alert inserted with its message is
 * announced too. Until then the message is laid out (nothing moves) but
 * invisible.
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

  /** Alert type: sets the colors and how assistive technologies announce it. */
  @property({ type: String })
  type: AlertType = "information";

  static styles = [DSBaseElement.styles ?? [], alertStyles];

  /** Whether the message has been revealed in the live region. */
  @state()
  private revealed = false;

  /**
   * `danger`/`warning` interrupt immediately (role="alert", implicit
   * aria-live="assertive"); `success`/`information` are announced without
   * interrupting the user (role="status", implicit aria-live="polite").
   * See https://www.w3.org/WAI/ARIA/apg/patterns/alert/.
   */
  private get alertRole(): "alert" | "status" {
    return this.type === "danger" || this.type === "warning" ? "alert" : "status";
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    setTimeout(() => {
      this.revealed = true;
    }, REVEAL_DELAY_MS);
  }

  render() {
    const pending = this.revealed ? "" : "alert--pending";
    return html`
      <div part="alert" class="alert alert--${this.type} ${pending}" role=${this.alertRole}>
        <slot></slot>
      </div>
    `;
  }
}
