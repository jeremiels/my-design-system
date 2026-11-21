import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { OverflowController } from "../../controllers/overflow.js";
import { TableSortEvent } from "../../events/table-sort.js";
import { toggleAll, toggleValue } from "../../state/selection.js";
import { nextSort, type SortDirection } from "../../state/table.js";
import { TableHeaderCell } from "../table-header-cell/table-header-cell.js";
import { TableRow } from "../table-row/table-row.js";
import tableStyles from "./table.css" with { type: "css" };
import tableTokens from "./table.tokens.css" with { type: "css" };

/**
 * A table of data, written with elements as an HTML table: `table-row`
 * children, whose cells are `table-cell` and `table-header-cell` (ADR 0030).
 * Any row fits: a row of details across the columns (`colspan`), a group
 * heading, a cell holding links, buttons or a `badge`.
 *
 * The rows with `slot="head"` form its header, which stays in view while
 * the other rows scroll under it. `label` is its caption and its name.
 *
 * A header cell with `sort-key` sorts the rows: a press fires `u-sort`, then
 * the table shows the new sort, `aria-sort` and an arrow. The table keeps
 * the order of its rows: the application sorts them, with `sortRows()` or
 * on its server, and renders them again.
 *
 * With `selectable`, each row gets a `checkbox` before its cells, named by
 * `selectMessage` and its row header; the head gets one for every row.
 * `values` holds the `value` of the rows selected; each choice of the user
 * fires `change`. A row without `value`, a row of details for instance, has
 * an empty cell there.
 *
 * The table scrolls past the width of the page, and past
 * `--u-table-max-block-size`. While it scrolls, it takes the focus, for the
 * keyboard, as a region named by its caption.
 *
 * @element u-table
 * @summary A table of data, written with row and cell elements, sortable, whose rows the user may select.
 * @slot - The rows of the body, `table-row` elements.
 * @slot head - The rows of the header, `table-row` elements of `table-header-cell`.
 * @slot empty - What shows in place of the rows while there are none: "No request yet" for instance.
 * @csspart scroller - The box that scrolls around the table.
 * @csspart table - The table, `role="table"`.
 * @csspart caption - The caption: `label`.
 * @csspart empty - The box of the `empty` slot.
 * @fires {TableSortEvent} u-sort - When the user presses a sortable header, before the table shows the new sort. Its `key` and `direction` give it. Cancelable: `preventDefault()` keeps the sort shown.
 * @fires {Event} change - When the user selects or deselects rows. `values` gives the selection.
 * @tokens table - Its tokens (`@cssprop`), shared by its rows and cells, from `@unicorne/tokens` (`src/component/table/`): `npm run analyze` documents them.
 */
export class Table extends DSBaseElement {
  static override componentName = "table";

  static styles = [super.styles ?? [], tableTokens, tableStyles];

  /** The caption of the table: its accessible name. */
  @property({ type: String })
  label = "";

  /** The `sort-key` of the header cell that sorts the rows, `""` when none. */
  @property({ type: String, attribute: "sort-key" })
  sortKey = "";

  /** The direction of the sort. */
  @property({ type: String, attribute: "sort-direction" })
  sortDirection: SortDirection = "ascending";

  /** Whether the user selects rows, with a checkbox before each one. Reflected. */
  @property({ type: Boolean, reflect: true })
  selectable = false;

  /** The `value` of the rows selected, in their order. Property only. */
  @property({ attribute: false })
  values: readonly string[] = [];

  /**
   * Writes the name of a row's checkbox from the name of the row: the text
   * of its row header, or else of its first cell. Give it in the page's
   * language. Property only.
   */
  @property({ attribute: false })
  selectMessage: (name: string) => string = (name) => `Select ${name}`.trim();

  /** The name of the checkbox of the head, which selects every row. */
  @property({ type: String, attribute: "select-all-label" })
  selectAllLabel = "Select all rows";

  /** Whether the body has no row: the `empty` slot shows. */
  @state()
  private empty = true;

  #overflow = new OverflowController(this, () =>
    this.renderRoot?.querySelector<HTMLElement>(".scroller"),
  );

  #observer?: MutationObserver;

  /** The name of the head's checkbox, as a row's: the same function at each render. */
  #selectAllLabel = () => this.selectAllLabel;

  connectedCallback(): void {
    super.connectedCallback();
    // The rows, their cells, and the header cells of the head.
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** The rows of the head. None on a server: the element has no children there. */
  get #headRows(): TableRow[] {
    return Array.from(this.children ?? []).filter(
      (child): child is TableRow => child instanceof TableRow && child.slot === "head",
    );
  }

  /** The rows of the body, in order. */
  get #bodyRows(): TableRow[] {
    return Array.from(this.children ?? []).filter(
      (child): child is TableRow => child instanceof TableRow && child.slot === "",
    );
  }

  /** The rows the user can select, as items: those with a `value`. */
  get #items(): { value: string }[] {
    return this.#bodyRows.filter((row) => row.value !== "").map((row) => ({ value: row.value }));
  }

  /**
   * Called by a header cell of the table when the user presses it: fires
   * `u-sort`, then shows the sort, unless canceled.
   * @internal
   */
  requestSort(key: string): void {
    const current = this.sortKey ? { key: this.sortKey, direction: this.sortDirection } : undefined;
    const next = nextSort(current, key);
    if (this.dispatchEvent(new TableSortEvent(next.key, next.direction))) {
      this.sortKey = next.key;
      this.sortDirection = next.direction;
    }
  }

  /**
   * Called by a row of the table when the user checks or unchecks it; by a
   * row of the head, for every row.
   * @internal
   */
  toggleRow(row: TableRow): void {
    this.values =
      row.slot === "head"
        ? toggleAll(this.#items, this.values)
        : toggleValue(this.#items, this.values, row.value);
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    const rows = this.#bodyRows;
    this.empty = rows.length === 0;
    // The selection holds rows of the table only.
    if (this.values.length > 0) {
      const values = new Set(rows.map((row) => row.value));
      const kept = this.values.filter((value) => values.has(value));
      if (kept.length !== this.values.length) {
        this.values = kept;
      }
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    const selected = new Set(this.values);
    const items = this.#items;
    const count = items.filter((item) => selected.has(item.value)).length;
    const all = items.length > 0 && count === items.length;
    for (const row of [...this.#headRows, ...this.#bodyRows]) {
      // A row a server rendered hydrates first, as it was rendered there.
      if (!row.hasUpdated) {
        void row.updateComplete.then(() => this.requestUpdate());
        continue;
      }
      const head = row.slot === "head";
      row.selectable = this.selectable;
      row.selected = head ? all : selected.has(row.value);
      row.indeterminate = head && count > 0 && !all;
      row.selectLabel = head ? this.#selectAllLabel : this.selectMessage;
      if (head) {
        for (const cell of row.children) {
          if (cell instanceof TableHeaderCell) {
            cell.sorted =
              cell.sortKey !== "" && cell.sortKey === this.sortKey ? this.sortDirection : undefined;
          }
        }
      }
    }
  }

  render() {
    const scrolls = this.#overflow.scrolls;
    return html`
      <div
        part="scroller"
        class="scroller"
        tabindex=${scrolls ? 0 : nothing}
        role=${scrolls ? "region" : nothing}
        aria-labelledby=${scrolls && this.label ? "caption" : nothing}
      >
        <div
          part="table"
          class="table"
          role="table"
          aria-labelledby=${this.label ? "caption" : nothing}
        >
          <div
            part="caption"
            class="caption"
            id="caption"
            aria-hidden="true"
            ?hidden=${!this.label}
          >
            ${this.label}
          </div>
          <div class="head" role="rowgroup"><slot name="head"></slot></div>
          <div class="body" role="rowgroup"><slot></slot></div>
        </div>
        <div part="empty" class="empty" ?hidden=${!this.empty}><slot name="empty"></slot></div>
      </div>
    `;
  }
}
