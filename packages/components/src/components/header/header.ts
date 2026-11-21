import { html } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { DSBaseElement } from "../../bases/base-element.js";
import headerStyles from "./header.css" with { type: "css" };
import headerTokens from "./header.tokens.css" with { type: "css" };

/**
 * The header of a page, its `banner` landmark: the logo, the name of the
 * service and its tagline, then the quick accesses, and the main navigation
 * under them (ADR 0034). One per page, in the `header` slot of `page`.
 *
 * The service name links to the home page of the service, `href`. The
 * quick accesses wrap under the service name on a narrow page.
 *
 * @element u-header
 * @summary The header of a page: the service, its quick accesses and its navigation.
 * @slot logo - Before the service name: the logo, or the brand block of the organization.
 * @slot actions - The quick accesses, at the end: links and buttons (help, account).
 * @slot navigation - Under the service name: the main navigation.
 * @csspart header - The row of the logo, the service and the quick accesses.
 * @csspart service - The service name and its tagline.
 * @csspart service-name - The service name, a link to `href`.
 * @csspart tagline - The tagline, under the service name.
 * @csspart actions - The quick accesses.
 * @csspart navigation - The wrapper of the main navigation.
 * @tokens header - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/header/`): `npm run analyze` documents them.
 */
export class Header extends DSBaseElement {
  static override componentName = "header";

  static styles = [super.styles ?? [], headerTokens, headerStyles];

  /** The name of the service, its title on every page. */
  @property({ type: String, attribute: "service-name" })
  serviceName = "";

  /** The line under the service name: what the service does. None by default. */
  @property({ type: String })
  tagline = "";

  /** The home page of the service: the service name links to it. */
  @property({ type: String })
  href?: string;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "banner");
    }
  }

  render() {
    return html`
      <div part="header" class="header">
        <slot name="logo"></slot>
        <div part="service" class="service">
          <a part="service-name" class="service-name" href=${ifDefined(this.href)}
            >${this.serviceName}</a
          >
          <p part="tagline" class="tagline" ?hidden=${!this.tagline}>${this.tagline}</p>
        </div>
        <div part="actions" class="actions"><slot name="actions"></slot></div>
      </div>
      <div part="navigation" class="navigation"><slot name="navigation"></slot></div>
    `;
  }
}
