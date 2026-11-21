import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { AnnounceController, announceStyles } from "../../controllers/announce.js";
import { paginationItems } from "../../state/pagination.js";
import { DSBaseElement } from "../../bases/base-element.js";
import paginationStyles from "./pagination.css" with { type: "css" };
import paginationTokens from "./pagination.tokens.css" with { type: "css" };

/**
 * A pagination: the buttons to move through the pages of a list, in a
 * navigation landmark. It shows the first and last pages, the current one
 * and its neighbours; a gap stands for the others (`state/pagination.ts`,
 * ADR 0020).
 *
 * `page` is the current page, from 1. A click on a page, on the previous or
 * the next button, sets it and fires `change`: the application shows that
 * page. A live region announces it: the content changes, the focus stays on
 * the button.
 *
 * @element u-pagination
 * @summary The buttons to move through the pages of a list.
 * @csspart nav - The `<nav>` landmark.
 * @csspart button - A button: a page, the previous or the next one.
 * @csspart gap - The gap that stands for the pages left out.
 * @fires change - When the user moves to another page: `page` holds it.
 * @tokens pagination - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/pagination/`): `npm run analyze` documents them.
 */
export class Pagination extends DSBaseElement {
  static override componentName = "pagination";

  static styles = [super.styles ?? [], announceStyles, paginationTokens, paginationStyles];

  /** The current page, from 1. Reflected. */
  @property({ type: Number, reflect: true })
  page = 1;

  /** The number of pages. */
  @property({ type: Number })
  pages = 1;

  /** The accessible name of the landmark: "Pagination", in the page's language. */
  @property({ type: String })
  label = "Pagination";

  /** The accessible name of the previous button, in the page's language. */
  @property({ type: String, attribute: "previous-label" })
  previousLabel = "Previous page";

  /** The accessible name of the next button, in the page's language. */
  @property({ type: String, attribute: "next-label" })
  nextLabel = "Next page";

  /** Writes the accessible name of a page's button, in the page's language. Property only. */
  @property({ attribute: false })
  pageLabel: (page: number) => string = (page) => `Page ${page}`;

  /** Writes what the live region announces after a move, in the page's language. Property only. */
  @property({ attribute: false })
  statusMessage: (page: number, pages: number) => string = (page, pages) =>
    `Page ${page} of ${pages}`;

  #announcer = new AnnounceController(this);

  /** Whether the text runs right to left: the chevron points the other way. */
  #rtl = false;

  override connectedCallback(): void {
    super.connectedCallback();
    const rtl = getComputedStyle(this).direction === "rtl";
    if (rtl !== this.#rtl) {
      this.#rtl = rtl;
      this.requestUpdate();
    }
  }

  /** The current page, within the bounds. */
  protected get currentPage(): number {
    return Math.min(Math.max(Math.round(this.page) || 1, 1), Math.max(this.pages, 1));
  }

  /** Moves to `page` at the user's request: `change`, and the announcement. */
  protected goTo(page: number): void {
    if (page === this.currentPage || page < 1 || page > this.pages) {
      return;
    }
    this.page = page;
    this.#announcer.announce(this.statusMessage(page, this.pages));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  render() {
    const current = this.currentPage;
    return html`
      <nav part="nav" class=${this.#rtl ? "rtl" : nothing} aria-label=${this.label}>
        <ul class="list" role="list">
          <li>
            <button
              part="button"
              class="button button--previous"
              type="button"
              aria-label=${this.previousLabel}
              ?disabled=${current <= 1}
              @click=${() => this.goTo(current - 1)}
            >
              <span class="chevron" aria-hidden="true"></span>
            </button>
          </li>
          ${paginationItems(current, this.pages).map((item) =>
            item === "gap"
              ? html`<li><span part="gap" class="gap" aria-hidden="true">…</span></li>`
              : html`<li>
                  <button
                    part="button"
                    class="button"
                    type="button"
                    aria-label=${this.pageLabel(item)}
                    aria-current=${item === current ? "page" : nothing}
                    @click=${() => this.goTo(item)}
                  >
                    ${item}
                  </button>
                </li>`,
          )}
          <li>
            <button
              part="button"
              class="button button--next"
              type="button"
              aria-label=${this.nextLabel}
              ?disabled=${current >= this.pages}
              @click=${() => this.goTo(current + 1)}
            >
              <span class="chevron" aria-hidden="true"></span>
            </button>
          </li>
        </ul>
      </nav>
      ${this.#announcer.render()}
    `;
  }
}
