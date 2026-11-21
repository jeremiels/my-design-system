import externalLink from "@unicorne/icons/external-link";
import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { Icon } from "../icon/icon.js";
import linkStyles from "./link.css" with { type: "css" };
import linkTokens from "./link.tokens.css" with { type: "css" };

/**
 * A link to a page, or to a place in a page: a native `<a>` in its shadow
 * root, which takes the focus of the host (ADR 0034). Inline, in a sentence
 * or alone.
 *
 * With `target="_blank"`, the link opens a new window: an icon follows its
 * text, and `new-window-label`, hidden on screen, ends its accessible name.
 * `current` marks the link of the page the user is on.
 *
 * A link that looks like a button is a `button-link`.
 *
 * @element u-link
 * @summary A link to a page.
 * @slot - The text of the link: it says where the link goes.
 * @csspart link - The native `<a>`.
 * @csspart icon - The icon of a link that opens a new window: the `icon` component of the same registration.
 * @tokens link - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/link/`): `npm run analyze` documents them.
 */
export class Link extends DSBaseElement {
  static override componentName = "link";

  static override dependencies = [Icon];

  static {
    // Its icon renders at once, on a server too (ADR 0032).
    Icon.bundle({ "external-link": externalLink });
  }

  static styles = [super.styles ?? [], linkTokens, linkStyles];

  static shadowRootOptions: ShadowRootInit = { ...super.shadowRootOptions, delegatesFocus: true };

  /** The URL the link goes to. */
  @property({ type: String })
  href?: string;

  /** Where the link opens, as on `<a>`: `_blank` opens a new window, and says it. */
  @property({ type: String })
  target?: string;

  /** The relation to the linked page, as on `<a>`. `noopener` with `target="_blank"` by default. */
  @property({ type: String })
  rel?: string;

  /** Downloads the linked file, under this name if given, as on `<a>`. */
  @property({ type: String })
  download?: string;

  /** The link of the page the user is on: `aria-current="page"`. */
  @property({ type: Boolean, reflect: true })
  current = false;

  /** The end of the accessible name of a link that opens a new window, hidden on screen, in the page's language. */
  @property({ type: String, attribute: "new-window-label" })
  newWindowLabel = "(new window)";

  render() {
    const icon = this.tagFor(Icon);
    const blank = this.target === "_blank";
    return html`<a
      part="link"
      class="link"
      href=${ifDefined(this.href)}
      target=${ifDefined(this.target)}
      rel=${ifDefined(this.rel ?? (blank ? "noopener" : undefined))}
      download=${ifDefined(this.download)}
      aria-current=${this.current ? "page" : nothing}
      ><slot></slot>${
        blank
          ? html`<${icon} part="icon" class="icon" name="external-link"></${icon}
              ><span class="hidden"> ${this.newWindowLabel}</span>`
          : nothing
      }</a
    >`;
  }
}
