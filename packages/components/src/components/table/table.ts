import { html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { OverflowController } from "../../controllers/overflow.js";
import { TableSortEvent } from "../../events/table-sort.js";
import { toggleAll, toggleValue } from "../../state/selection.js";
import { nextSort, type SortDirection } from "../../state/table.js";
import tableStyles from "./table.css" with { type: "css" };
import tableTokens from "./table.tokens.css" with { type: "css" };
import type { TableColumn, TableRow } from "./table.type.js";

/**
 * A table of data: rows and columns, a caption, headers that sort, and
 * rows the user selects (ADR 0030). It renders a native `<table>`, from
 * `columns` and `rows`: assistive technologies read it as any table.
 *
 * A sortable column has a button in its header. A press fires `u-sort`,
 * then shows the new sort: `aria-sort` and an arrow. The table keeps the
 * order of `rows`: the application sorts them, with `sortRows()` or on its
 * server.
 *
 * With `selectable`, a column of checkboxes selects rows, and a box in its
 * header all of them. `values` holds the keys of the rows selected, from
 * `row-key`; each choice of the user fires `change`. A checkbox is named by
 * `select-label` and its row's header cell.
 *
 * The table scrolls past the width of the page, and past
 * `--u-table-max-block-size` under its header row. While it scrolls, it
 * takes the focus, for the keyboard, as a region named by its caption.
 *
 * @element u-table
 * @summary A table of data, sortable, whose rows the user may select.
 * @slot empty - What shows in place of the rows while there are none: "No request yet" for instance.
 * @csspart scroller - The box that scrolls around the table.
 * @csspart table - The `<table>`.
 * @csspart caption - The caption: `label`.
 * @csspart column-header - The header of a column.
 * @csspart sort-button - The button of a sortable column's header.
 * @csspart row - A row of the body. A selected one has `aria-selected="true"`.
 * @csspart cell - A cell of the body, row headers included.
 * @csspart select - The checkbox of a row.
 * @csspart select-all - The checkbox of the header, for every row.
 * @fires {TableSortEvent} u-sort - When the user presses a sortable header, before the table shows the new sort. Its `key` and `direction` give it. Cancelable: `preventDefault()` keeps the sort shown.
 * @fires {Event} change - When the user selects or deselects rows. `values` gives the selection.
 * @tokens table - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/table/`): `npm run analyze` documents them.
 */
export class Table extends DSBaseElement {
  static override componentName = "table";

  static styles = [super.styles ?? [], tableTokens, tableStyles];

  /** The caption of the table: its accessible name. */
  @property({ type: String })
  label = "";

  /** The columns, in order. Property only. */
  @property({ attribute: false })
  columns: readonly TableColumn[] = [];

  /** The rows, in the order the table shows them. Property only. */
  @property({ attribute: false })
  rows: readonly TableRow[] = [];

  /** The key of a row's value that identifies it, for `values`. Its index when the row has none. */
  @property({ type: String, attribute: "row-key" })
  rowKey = "id";

  /** The `key` of the column that sorts the rows, `""` when none. */
  @property({ type: String, attribute: "sort-key" })
  sortKey = "";

  /** The direction of the sort. */
  @property({ type: String, attribute: "sort-direction" })
  sortDirection: SortDirection = "ascending";

  /** Whether the user selects rows, with a column of checkboxes. */
  @property({ type: Boolean, reflect: true })
  selectable = false;

  /** The keys of the rows selected, in their order. Property only. */
  @property({ attribute: false })
  values: readonly string[] = [];

  /** Read before the name of a row, in the name of its checkbox: "Select Dupont". */
  @property({ type: String, attribute: "select-label" })
  selectLabel = "Select";

  /** The name of the checkbox of the header, which selects every row. */
  @property({ type: String, attribute: "select-all-label" })
  selectAllLabel = "Select all rows";

  #overflow = new OverflowController(this, () =>
    this.renderRoot?.querySelector<HTMLElement>(".scroller"),
  );

  /** The keys of the rows, by index. */
  get #keys(): string[] {
    return this.rows.map((row, index) => {
      const key = row[this.rowKey];
      return key === undefined || key === null ? String(index) : String(key);
    });
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    // The selection holds rows of the table only.
    if (changedProperties.has("rows") && this.values.length > 0) {
      const keys = new Set(this.#keys);
      const values = this.values.filter((value) => keys.has(value));
      if (values.length !== this.values.length) {
        this.values = values;
      }
    }
  }

  render() {
    const keys = this.#keys;
    const selected = new Set(this.values);
    const columnCount = this.columns.length + (this.selectable ? 1 : 0);
    const named = Math.max(
      this.columns.findIndex((column) => column.rowHeader),
      0,
    );
    const scrolls = this.#overflow.scrolls;
    return html`
      <div
        part="scroller"
        class="scroller"
        tabindex=${scrolls ? 0 : nothing}
        role=${scrolls ? "region" : nothing}
        aria-labelledby=${scrolls && this.label ? "caption" : nothing}
      >
        <table part="table" class="table">
          ${
            this.label
              ? html`<caption part="caption" id="caption">
                  ${this.label}
                </caption>`
              : nothing
          }
          <thead>
            <tr>
              ${this.selectable ? this.#renderSelectAll(keys, selected) : nothing}
              ${this.columns.map((column) => this.#renderHeader(column))}
            </tr>
          </thead>
          <tbody>
            <tr class="empty" ?hidden=${this.rows.length > 0}>
              <td colspan=${columnCount}><slot name="empty"></slot></td>
            </tr>
            ${repeat(
              this.rows,
              (_row, index) => keys[index],
              (row, index) => this.#renderRow(row, index, keys[index]!, selected, named),
            )}
          </tbody>
        </table>
      </div>
      <span id="select-label" hidden>${this.selectLabel}</span>
    `;
  }

  #renderHeader(column: TableColumn) {
    const sorted = this.sortKey !== "" && this.sortKey === column.key;
    return html`<th
      part="column-header"
      class=${column.align === "end" ? "end" : "start"}
      scope="col"
      aria-sort=${sorted ? this.sortDirection : nothing}
    >
      ${
        column.sortable
          ? html`<button
              part="sort-button"
              class="sort"
              type="button"
              data-sorted=${sorted ? this.sortDirection : nothing}
              @click=${() => this.#sort(column.key)}
            >
              ${column.label}<span class="sort-icon" aria-hidden="true"></span>
            </button>`
          : column.label
      }
    </th>`;
  }

  #renderSelectAll(keys: readonly string[], selected: ReadonlySet<string>) {
    const count = keys.filter((key) => selected.has(key)).length;
    return html`<th class="select" scope="col">
      <input
        part="select-all"
        type="checkbox"
        aria-label=${this.selectAllLabel}
        .checked=${count > 0 && count === keys.length}
        .indeterminate=${count > 0 && count < keys.length}
        ?disabled=${keys.length === 0}
        @change=${this.#selectAll}
      />
    </th>`;
  }

  #renderRow(
    row: TableRow,
    index: number,
    key: string,
    selected: ReadonlySet<string>,
    named: number,
  ) {
    const isSelected = selected.has(key);
    return html`<tr part="row" aria-selected=${this.selectable ? String(isSelected) : nothing}>
      ${
        this.selectable
          ? html`<td class="select">
              <input
                part="select"
                type="checkbox"
                aria-labelledby="select-label name-${index}"
                .checked=${isSelected}
                @change=${() => this.#select(key)}
              />
            </td>`
          : nothing
      }
      ${this.columns.map((column, columnIndex) => {
        const content = column.render ? column.render(row) : this.#format(row[column.key]);
        const id = columnIndex === named ? `name-${index}` : nothing;
        const align = column.align === "end" ? "end" : "start";
        return column.rowHeader
          ? html`<th part="cell" class=${align} scope="row" id=${id}>${content}</th>`
          : html`<td part="cell" class=${align} id=${id}>${content}</td>`;
      })}
    </tr>`;
  }

  /** A value as text: numbers and dates in the page's language. */
  #format(value: unknown): string {
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "number") {
      return new Intl.NumberFormat(this.language).format(value);
    }
    if (value instanceof Date) {
      return new Intl.DateTimeFormat(this.language, { dateStyle: "medium" }).format(value);
    }
    return String(value);
  }

  #sort(key: string): void {
    const current = this.sortKey ? { key: this.sortKey, direction: this.sortDirection } : undefined;
    const next = nextSort(current, key);
    if (this.dispatchEvent(new TableSortEvent(next.key, next.direction))) {
      this.sortKey = next.key;
      this.sortDirection = next.direction;
    }
  }

  #select(key: string): void {
    const items = this.#keys.map((value) => ({ value }));
    this.values = toggleValue(items, this.values, key);
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #selectAll = () => {
    const items = this.#keys.map((value) => ({ value }));
    this.values = toggleAll(items, this.values);
    this.dispatchEvent(new Event("change", { bubbles: true }));
  };
}
