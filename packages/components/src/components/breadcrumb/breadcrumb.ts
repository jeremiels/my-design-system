import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../base-element.js";
import { BreadcrumbItem } from "../breadcrumb-item/breadcrumb-item.js";
import breadcrumbStyles from "./breadcrumb.css" with { type: "css" };
import breadcrumbTokens from "./breadcrumb.tokens.css" with { type: "css" };

/**
 * A breadcrumb: the links to the pages above the current one, in a
 * navigation landmark. Its children are `breadcrumb-item`, from the home
 * page to the current one (ADR 0020).
 *
 * The last item is the current page, unless another one has `current`: its
 * link has `aria-current="page"`. A chevron separates the items, hidden from
 * assistive technologies: the list says the order.
 *
 * @element u-breadcrumb
 * @summary The links to the pages above the current one.
 * @slot - The `breadcrumb-item` elements of the same registration.
 * @csspart nav - The `<nav>` landmark.
 * @csspart list - The list of items.
 * @tokens breadcrumb - Its tokens (`@cssprop`), shared with its items, from `@unicorne/tokens` (`src/component/breadcrumb/`): `npm run analyze` documents them.
 */
export class Breadcrumb extends DSBaseElement {
  static override componentName = "breadcrumb";

  /** Recognizes its items of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [BreadcrumbItem];

  static styles = [super.styles ?? [], breadcrumbTokens, breadcrumbStyles];

  /** The accessible name of the landmark: "Breadcrumb", in the page's language. */
  @property({ type: String })
  label = "Breadcrumb";

  /** The items, in order. None on a server: the element has no children there. */
  protected get items(): readonly BreadcrumbItem[] {
    return Array.from(this.children ?? []).filter(
      (child): child is BreadcrumbItem => child instanceof BreadcrumbItem,
    );
  }

  /** Without an item marked `current`, the last one is. */
  #markCurrent = () => {
    const items = this.items;
    if (!items.some((item) => item.current) && items.length > 0) {
      items[items.length - 1]!.current = true;
    }
  };

  protected override firstUpdated(): void {
    this.#markCurrent();
  }

  render() {
    return html`
      <nav part="nav" aria-label=${this.label}>
        <div part="list" class="list" role="list">
          <slot @slotchange=${this.#markCurrent}></slot>
        </div>
      </nav>
    `;
  }
}
