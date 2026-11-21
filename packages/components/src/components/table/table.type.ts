/** A row of a table: its values by the `key` of their column. */
export type TableRow = Readonly<Record<string, unknown>>;

/** A column of a table. */
export interface TableColumn<Row extends TableRow = TableRow> {
  /** The key of the column's value in each row, and of the column in `sort-key`. */
  readonly key: string;
  /** The text of the column header. */
  readonly label: string;
  /** Whether its header sorts the rows: a button, and `aria-sort` while it sorts them. */
  readonly sortable?: boolean;
  /** The alignment of its cells: `end` for numbers. `start` by default. */
  readonly align?: "start" | "end";
  /** Whether its cells name their row: `<th scope="row">`, the name of the row's checkbox. */
  readonly rowHeader?: boolean;
  /** Renders a cell: a link or a badge for instance. Its value, formatted, by default. */
  readonly render?: (row: Row) => unknown;
}
