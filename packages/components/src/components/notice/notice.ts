import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { NoticeCloseEvent } from "../../events/notice-close.js";
import { Button } from "../button/button.js";
import { Icon } from "../icon/icon.js";
import noticeStyles from "./notice.css" with { type: "css" };
import noticeTokens from "./notice.tokens.css" with { type: "css" };
import type { NoticeVariant } from "./notice.type.js";

/**
 * A banner of important information for the whole service, above its
 * header: an outage, a deadline (ADR 0034). In the `banner` slot of `page`.
 *
 * It isn't a live region: present when the page loads, it reads as content,
 * before the header. The message says its nature, « Information : »,
 * « Warning: »: the color and the icon don't say it alone (WCAG 1.4.1). A
 * message that appears after an action is an `alert` or a toast.
 *
 * With `dismissible`, a close button hides it (`hidden`) and fires
 * `u-close`. The application keeps the choice, and moves the focus to the
 * content: `page.focusContent()`.
 *
 * @element u-notice
 * @summary A banner of important information, above the header.
 * @slot - The message: its nature first, then the information, and a link if needed.
 * @csspart notice - The banner.
 * @csspart icon - The icon of the variant: the `icon` component of the same registration.
 * @csspart message - The message.
 * @csspart close-button - The close button: the `button` component of the same registration.
 * @fires {NoticeCloseEvent} u-close - When the user closes the notice: it is then `hidden`.
 * @tokens notice - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/notice/`): `npm run analyze` documents them.
 */
export class Notice extends DSBaseElement {
  static override componentName = "notice";

  static override dependencies = [Button, Icon];

  static styles = [super.styles ?? [], noticeTokens, noticeStyles];

  /** The intent of the notice: its colors and its icon. Reflected. */
  @property({ type: String, reflect: true })
  variant: NoticeVariant = "information";

  /** Whether the user can close the notice: a close button follows the message. */
  @property({ type: Boolean, reflect: true })
  dismissible = false;

  /** Accessible name of the close button, in the page's language. */
  @property({ type: String, attribute: "close-label" })
  closeLabel = "Close";

  #close = () => {
    this.hidden = true;
    this.dispatchEvent(new NoticeCloseEvent());
  };

  render() {
    const button = this.tagFor(Button);
    const icon = this.tagFor(Icon);
    return html`
      <div part="notice" class="notice">
        <${icon} part="icon" class="icon" name=${this.variant}></${icon}>
        <div part="message" class="message"><slot></slot></div>
        <${button}
          part="close-button"
          class="close"
          variant=${this.variant}
          label=${this.closeLabel}
          ?hidden=${!this.dismissible}
          @click=${this.#close}
        >
          <${icon} name="close"></${icon}>
        </${button}>
      </div>
    `;
  }
}
