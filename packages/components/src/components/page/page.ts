import { html } from "lit";
import { property, query } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import pageStyles from "./page.css" with { type: "css" };
import pageTokens from "./page.tokens.css" with { type: "css" };

/**
 * The layout of a page: a notice, its header, its navigation beside its
 * content, and its footer (ADR 0034). One per page.
 *
 * The content is the page's `main` landmark. A skip link comes first in the
 * page: hidden until it has the focus, it moves the focus to the content,
 * past the header and the navigation (WCAG 2.4.1). The header and the footer
 * bring their own landmarks: `header` and `footer`.
 *
 * The navigation and the content sit side by side. When the page is
 * narrower than `--u-page-navigation-inline-size` plus
 * `--u-page-content-min-inline-size`, the navigation goes above the
 * content: no media query.
 *
 * @element u-page
 * @summary The layout of a page, its landmarks and its skip link.
 * @slot - The content of the page, in its `main` landmark.
 * @slot banner - Above the header: a `notice`.
 * @slot header - The header of the page: a `header`.
 * @slot navigation - Beside the content: a `side-nav`.
 * @slot footer - The footer of the page: a `footer`.
 * @csspart skip-links - The `<nav>` of the skip link.
 * @csspart skip-link - The skip link, shown while it has the focus.
 * @csspart body - The navigation and the content, side by side.
 * @csspart main - The `<main>` landmark around the content.
 * @tokens page - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/page/`): `npm run analyze` documents them.
 */
export class Page extends DSBaseElement {
  static override componentName = "page";

  static styles = [super.styles ?? [], pageTokens, pageStyles];

  /** The accessible name of the navigation of the skip link, in the page's language. */
  @property({ type: String, attribute: "skip-links-label" })
  skipLinksLabel = "Skip links";

  /** The text of the skip link, in the page's language. */
  @property({ type: String, attribute: "skip-to-content-label" })
  skipToContentLabel = "Skip to content";

  @query("main")
  private main?: HTMLElement;

  /** Moves the focus to the content: its landmark, for the next Tab to enter it. */
  focusContent(options?: FocusOptions): void {
    this.main?.focus(options);
  }

  /** A fragment can't reach into a shadow root: the link moves the focus itself. */
  #skip = (event: MouseEvent) => {
    event.preventDefault();
    this.focusContent();
  };

  render() {
    return html`
      <nav part="skip-links" class="skip-links" aria-label=${this.skipLinksLabel}>
        <a part="skip-link" class="skip-link" href="#main" @click=${this.#skip}
          >${this.skipToContentLabel}</a
        >
      </nav>
      <slot name="banner"></slot>
      <slot name="header"></slot>
      <div part="body" class="body">
        <slot name="navigation"></slot>
        <main part="main" class="main" id="main" tabindex="-1"><slot></slot></main>
      </div>
      <slot name="footer"></slot>
    `;
  }
}
