import { html } from "lit";
import { DSBaseElement } from "../../bases/base-element.js";
import footerStyles from "./footer.css" with { type: "css" };
import footerTokens from "./footer.tokens.css" with { type: "css" };

/**
 * The footer of a page, its `contentinfo` landmark: the logo, a few words
 * on the service, and the links every page carries (ADR 0034). One per
 * page, in the `footer` slot of `page`.
 *
 * A public service writes its accessibility status among the links: « Accessibilité :
 * partiellement conforme », linked to its accessibility statement.
 *
 * @element u-footer
 * @summary The footer of a page: the service and its mandatory links.
 * @slot logo - The logo, or the brand block of the organization.
 * @slot - A few words on the service.
 * @slot links - The links of every page, in a list: accessibility, legal notice, personal data.
 * @csspart footer - The wrapper of the logo, the content and the links.
 * @csspart content - The content.
 * @csspart links - The wrapper of the links.
 * @tokens footer - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/footer/`): `npm run analyze` documents them.
 */
export class Footer extends DSBaseElement {
  static override componentName = "footer";

  static styles = [super.styles ?? [], footerTokens, footerStyles];

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "contentinfo");
    }
  }

  render() {
    return html`
      <div part="footer" class="footer">
        <slot name="logo"></slot>
        <div part="content" class="content"><slot></slot></div>
        <div part="links" class="links"><slot name="links"></slot></div>
      </div>
    `;
  }
}
