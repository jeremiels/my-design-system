import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { SideNavItem } from "../side-nav-item/side-nav-item.js";
import sideNavStyles from "./side-nav.css" with { type: "css" };
import sideNavTokens from "./side-nav.tokens.css" with { type: "css" };

/**
 * A navigation beside the content: the pages of a section, in a list, and
 * groups of pages that open and close (ADR 0034). Its children are
 * `side-nav-item`, in the `navigation` slot of `page`.
 *
 * The item of the current page has `current`: its link carries
 * `aria-current="page"`, and the groups around it open.
 *
 * @element u-side-nav
 * @summary The pages of a section, beside the content.
 * @slot - The `side-nav-item` elements of the same registration.
 * @csspart nav - The `<nav>` landmark.
 * @csspart list - The list of items.
 * @tokens side-nav - Its tokens (`@cssprop`), shared with its items, from `@unicorne/tokens` (`src/component/side-nav/`): `npm run analyze` documents them.
 */
export class SideNav extends DSBaseElement {
  static override componentName = "side-nav";

  /** Its items: registering the navigation registers them. */
  static override dependencies = [SideNavItem];

  static styles = [super.styles ?? [], sideNavTokens, sideNavStyles];

  /** The accessible name of the landmark: the name of the section, in the page's language. */
  @property({ type: String })
  label = "Section";

  render() {
    return html`
      <nav part="nav" aria-label=${this.label}>
        <div part="list" class="list" role="list"><slot></slot></div>
      </nav>
    `;
  }
}
