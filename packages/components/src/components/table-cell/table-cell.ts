import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import tableTokens from "../table/table.tokens.css" with { type: "css" };
import type { TableCellAlign } from "../table/table.type.js";
import tableCellStyles from "./table-cell.css" with { type: "css" };

/**
 * A cell of a `table-row`: text, links, buttons, a `badge` (ADR 0030).
 *
 * It renders a `<td>` with `role="cell"`, the box of the cell in the
 * table's layout: the host itself makes no box. `colspan` spans the cell
 * over several columns, a row of details under a row for instance.
 *
 * @element u-table-cell
 * @summary A cell of a table row.
 * @slot - The content of the cell.
 * @csspart cell - The cell.
 * @tokens table - Its tokens (`@cssprop`), shared with `table`, from `@unicorne/tokens` (`src/component/table/`): `npm run analyze` documents them.
 */
export class TableCell extends DSBaseElement {
  static override componentName = "table-cell";

  static styles = [super.styles ?? [], tableTokens, tableCellStyles];

  /** The alignment of its content: `end` for numbers. */
  @property({ type: String, reflect: true })
  align: TableCellAlign = "start";

  /** The number of columns the cell spans, as on a native `<td>`. */
  @property({ type: Number })
  colspan = 1;

  render() {
    const span = this.colspan > 1 ? this.colspan : 1;
    return html`<td
      part="cell"
      class="cell"
      role="cell"
      colspan=${span > 1 ? span : nothing}
      aria-colspan=${span > 1 ? span : nothing}
    >
      <slot></slot>
    </td>`;
  }
}
