import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html as staticHtml } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { Checkbox } from "../checkbox/checkbox.js";
import tableTokens from "../table/table.tokens.css" with { type: "css" };
import type { Table } from "../table/table.js";
import tableRowStyles from "./table-row.css" with { type: "css" };

/**
 * A row of a `table`: its cells, `table-cell` and `table-header-cell`
 * elements (ADR 0030). With `slot="head"`, a row of the table's header.
 *
 * The host has `role="row"`. In a `selectable` table, the row starts with a
 * cell holding a `checkbox`, set by its table: checked while the row is
 * `selected`, named by the table's `selectMessage` and the row's name, the
 * text of its row header, or else of its first cell. A row without `value`
 * has an empty cell there, to keep the columns aligned. In the head, the
 * checkbox selects every row.
 *
 * @element u-table-row
 * @summary A row of a table.
 * @slot - The cells of the row.
 * @csspart select-cell - The first cell of a row of a `selectable` table.
 * @csspart select - Its `checkbox`: the `checkbox` component of the same registration.
 * @tokens table - Its tokens (`@cssprop`), shared with `table`, from `@unicorne/tokens` (`src/component/table/`): `npm run analyze` documents them.
 */
export class TableRow extends DSBaseElement {
  static override componentName = "table-row";

  /** Renders its checkbox with the `checkbox` of its own registration. */
  static override dependencies = [Checkbox];

  static styles = [super.styles ?? [], tableTokens, tableRowStyles];

  /** What identifies the row in the `values` of its table. A row without one isn't selectable. */
  @property({ type: String })
  value = "";

  /** Whether the row is selected. Set by its table, from its `values`. Reflected. */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /**
   * Whether the row has a checkbox: its table's `selectable`.
   * @internal
   */
  @property({ attribute: false })
  selectable = false;

  /**
   * For a row of the head: some rows are selected, not all of them.
   * @internal
   */
  @property({ attribute: false })
  indeterminate = false;

  /**
   * Writes the name of the checkbox from the row's name: set by its table.
   * @internal
   */
  @property({ attribute: false })
  selectLabel: (name: string) => string = (name) => name;

  /** The name of the row, read once rendered: the first render depends on properties only. */
  @state()
  private name = "";

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "row");
    }
  }

  protected override firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    this.#readName();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    const head = this.slot === "head";
    if (this.selectable && !head && this.value !== "") {
      this.setAttribute("aria-selected", String(this.selected));
    } else {
      this.removeAttribute("aria-selected");
    }
    if (changedProperties.has("value") && changedProperties.get("value") !== undefined) {
      // Its table computes its selection from the values of its rows.
      this.#table?.requestUpdate();
    }
  }

  render() {
    return html`${this.selectable ? this.#renderSelect() : nothing}<slot
        @slotchange=${this.#readName}
      ></slot>`;
  }

  #renderSelect() {
    const head = this.slot === "head";
    const checkbox = this.tagFor(Checkbox);
    const content =
      head || this.value !== ""
        ? staticHtml`<${checkbox}
            part="select"
            label-hidden
            label=${this.selectLabel(this.name)}
            .checked=${this.selected}
            .indeterminate=${this.indeterminate}
            @change=${this.#toggle}
          ></${checkbox}>`
        : nothing;
    // A cell in the head too: its checkbox has a name, the column no header
    // text (axe empty-table-header).
    return html`<div part="select-cell" class="select" role="cell">${content}</div>`;
  }

  /** The table of the row: its parent. */
  get #table(): Table | undefined {
    const parent = this.parentElement as (Table & { toggleRow?: unknown }) | null;
    return parent && typeof parent.toggleRow === "function" ? parent : undefined;
  }

  /** The text of its row header, or else of its first cell. */
  #readName = () => {
    const cells = Array.from(this.children);
    const header = cells.find((cell) => cell.getAttribute("scope") === "row") ?? cells[0];
    this.name = (header?.textContent ?? "").replace(/\s+/g, " ").trim();
  };

  #toggle = (event: Event) => {
    // The table's `change` stands for it.
    event.stopPropagation();
    this.#table?.toggleRow(this);
  };
}
