import chevronDown from "@unicorne/icons/chevron-down";
import chevronUp from "@unicorne/icons/chevron-up";
import chevronUpDown from "@unicorne/icons/chevron-up-down";
import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import type { SortDirection } from "../../state/table.js";
import { Icon } from "../icon/icon.js";
import tableTokens from "../table/table.tokens.css" with { type: "css" };
import type { Table } from "../table/table.js";
import type { TableCellAlign, TableHeaderScope } from "../table/table.type.js";
import tableHeaderCellStyles from "./table-header-cell.css" with { type: "css" };

/**
 * A header cell of a `table-row`: the header of a column, in a row of the
 * head, or of its row, with `scope="row"` (ADR 0030).
 *
 * It renders a `<th>` with `role="columnheader"` or `"rowheader"`: the host
 * itself makes no box. A column header with `sort-key` has a button that
 * sorts the rows: its table fires `u-sort`, then shows the sort,
 * `aria-sort` and an arrow. The headers of the head stay in view while the
 * rows scroll.
 *
 * @element u-table-header-cell
 * @summary A header cell of a table row, which may sort the rows.
 * @slot - The text of the header.
 * @csspart header-cell - The header cell.
 * @csspart sort-button - The button of a sortable column's header.
 * @tokens table - Its tokens (`@cssprop`), shared with `table`, from `@unicorne/tokens` (`src/component/table/`): `npm run analyze` documents them.
 */
export class TableHeaderCell extends DSBaseElement {
  static {
    // Its chevrons render at once, on a server too (ADR 0032).
    Icon.bundle({
      "chevron-down": chevronDown,
      "chevron-up": chevronUp,
      "chevron-up-down": chevronUpDown,
    });
  }

  static override componentName = "table-header-cell";

  static override dependencies = [Icon];

  static styles = [super.styles ?? [], tableTokens, tableHeaderCellStyles];

  /** What it heads, as on a native `<th>`: its column, or its row. Reflected. */
  @property({ type: String, reflect: true })
  scope: TableHeaderScope = "col";

  /** The key its table sorts the rows by, in `sort-key` and `u-sort`. `""`: the column doesn't sort. */
  @property({ type: String, attribute: "sort-key" })
  sortKey = "";

  /** The alignment of its content: `end` over numbers. */
  @property({ type: String, reflect: true })
  align: TableCellAlign = "start";

  /** The number of columns the header spans, as on a native `<th>`. */
  @property({ type: Number })
  colspan = 1;

  /**
   * The direction its table sorts the rows by its key, `undefined` while it
   * sorts them by another one.
   * @internal
   */
  @property({ attribute: false })
  sorted?: SortDirection;

  render() {
    const span = this.colspan > 1 ? this.colspan : 1;
    const sortable = this.sortKey !== "" && this.scope === "col";
    return html`<th
      part="header-cell"
      class="header"
      role=${this.scope === "row" ? "rowheader" : "columnheader"}
      colspan=${span > 1 ? span : nothing}
      aria-colspan=${span > 1 ? span : nothing}
      aria-sort=${sortable && this.sorted ? this.sorted : nothing}
    >
      ${
        sortable
          ? html`<button
              part="sort-button"
              class="sort"
              type="button"
              data-sorted=${this.sorted ?? nothing}
              @click=${this.#sort}
            >
              <slot></slot
              ><${this.tagFor(Icon)}
                class="sort-icon"
                name=${
                  this.sorted === "ascending"
                    ? "chevron-up"
                    : this.sorted === "descending"
                      ? "chevron-down"
                      : "chevron-up-down"
                }
              ></${this.tagFor(Icon)}>
            </button>`
          : html`<slot></slot>`
      }
    </th>`;
  }

  /** The table of the cell: the parent of its row. */
  get #table(): Table | undefined {
    const table = this.parentElement?.parentElement as (Table & { requestSort?: unknown }) | null;
    return table && typeof table.requestSort === "function" ? table : undefined;
  }

  #sort = () => {
    this.#table?.requestSort(this.sortKey);
  };
}
