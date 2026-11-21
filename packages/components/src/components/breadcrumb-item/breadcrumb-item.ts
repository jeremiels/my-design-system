import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { DSBaseElement } from "../../bases/base-element.js";
import breadcrumbItemStyles from "./breadcrumb-item.css" with { type: "css" };

/**
 * An item of a `breadcrumb`: a link to a page above the current one, or the
 * current page. The host has `role="listitem"`; a chevron follows it, but
 * after the last item (ADR 0020).
 *
 * @element u-breadcrumb-item
 * @summary A link of a breadcrumb.
 * @slot - The name of the page.
 * @csspart link - The link, or the text of the current page.
 */
export class BreadcrumbItem extends DSBaseElement {
  static override componentName = "breadcrumb-item";

  static styles = [super.styles ?? [], breadcrumbItemStyles];

  /** The URL of the page. The current page may have none. */
  @property({ type: String })
  href?: string;

  /** The page the user is on: its link has `aria-current="page"`. The last item by default. Reflected. */
  @property({ type: Boolean, reflect: true })
  current = false;

  /** Whether the text runs right to left: the chevron points the other way. */
  #rtl = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "listitem");
    }
    const rtl = getComputedStyle(this).direction === "rtl";
    if (rtl !== this.#rtl) {
      this.#rtl = rtl;
      this.requestUpdate();
    }
  }

  render() {
    const current = this.current ? "page" : nothing;
    return html`${
        this.href
          ? html`<a part="link" class="link" href=${ifDefined(this.href)} aria-current=${current}
              ><slot></slot
            ></a>`
          : html`<span part="link" class="link" aria-current=${current}><slot></slot></span>`
      }<span class="separator${this.#rtl ? " separator--rtl" : ""}" aria-hidden="true"></span>`;
  }
}
