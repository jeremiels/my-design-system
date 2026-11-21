import { isServer, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { Icon } from "../icon/icon.js";
import alertStyles from "./alert.css" with { type: "css" };
import alertTokens from "./alert.tokens.css" with { type: "css" };
import type { AlertVariant } from "./alert.type.js";

/**
 * How long the live region stays empty before the message is revealed: the
 * time screen readers need to register a new live region (Angular CDK's
 * LiveAnnouncer waits 100 ms for the same reason).
 */
const REVEAL_DELAY_MS = 100;

/**
 * An alert component that displays a message to the user.
 *
 * The icon of its variant comes first: the icon of the same name, from the
 * `icon` component of its registration. It's decorative: the variant is in
 * the role and the colors, and the message says it.
 *
 * Its container is a live region (`role="status"` or `"alert"`, from
 * `variant`). Screen readers announce what is added to a live region, not what
 * it already held when it appeared, so the message is revealed 100 ms after
 * the alert is first rendered: an alert inserted with its message is
 * announced too. Until then the message is laid out (nothing moves) but
 * invisible. An alert a server rendered shows its message at once.
 *
 * @element u-alert
 * @summary Displays a message, announced to assistive technologies.
 * @slot - The content of the alert.
 * @csspart alert - The alert container.
 * @csspart icon - The icon of the variant: the `icon` component of the same registration.
 * @tokens alert - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/alert/`): `npm run analyze` documents them.
 */
export class Alert extends DSBaseElement {
  static override componentName = "alert";

  /** Renders the icon of its variant with the `icon` of its own registration (ADR 0001, D2). */
  static override dependencies = [Icon];

  /** The intent of the alert: sets its colors, its icon and how assistive technologies announce it. */
  @property({ type: String, reflect: true })
  variant: AlertVariant = "information";

  static styles = [DSBaseElement.styles ?? [], alertTokens, alertStyles];

  /**
   * Whether the message has been revealed in the live region. A message a
   * server rendered (ADR 0014) is there when the page loads, and readable
   * without script: revealing it later would add nothing to announce. The
   * element then has its shadow root before its first render.
   */
  @state()
  private revealed = isServer || this.shadowRoot !== null;

  /**
   * `danger`/`warning` interrupt immediately (role="alert", implicit
   * aria-live="assertive"); `success`/`information` are announced without
   * interrupting the user (role="status", implicit aria-live="polite").
   * See https://www.w3.org/WAI/ARIA/apg/patterns/alert/.
   */
  private get alertRole(): "alert" | "status" {
    return this.variant === "danger" || this.variant === "warning" ? "alert" : "status";
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    setTimeout(() => {
      this.revealed = true;
    }, REVEAL_DELAY_MS);
  }

  render() {
    const pending = this.revealed ? "" : " alert--pending";
    const icon = this.tagFor(Icon);
    return html`
      <div part="alert" class="alert${pending}" role=${this.alertRole}>
        <${icon} part="icon" name=${this.variant}></${icon}>
        <div class="message"><slot></slot></div>
      </div>
    `;
  }
}
