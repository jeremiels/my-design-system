import type { SortDirection } from "../state/table.js";

/**
 * Fired by `table` when the user presses the header of a sortable column,
 * before the table shows the new sort. The application sorts its rows, by
 * `key` and `direction`. Cancelable: `preventDefault()` keeps the sort
 * shown.
 */
export class TableSortEvent extends Event {
  /** The key of the column that sorts the rows. */
  readonly key: string;

  /** The direction of the sort. */
  readonly direction: SortDirection;

  constructor(key: string, direction: SortDirection) {
    super("u-sort", { bubbles: true, composed: true, cancelable: true });
    this.key = key;
    this.direction = direction;
  }
}
