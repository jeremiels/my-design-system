/**
 * The sort of a table, without DOM nor Lit (ADR 0010, ADR 0030): which
 * column sorts the rows, in which direction, and the rows in that order.
 * `Table` shows the sort; the application sorts its rows, with `sortRows()`
 * or on its server.
 */

/** The direction of a sort, as `aria-sort` says it. */
export type SortDirection = "ascending" | "descending";

/** A sort: the key of the column, and the direction. */
export interface TableSort {
  readonly key: string;
  readonly direction: SortDirection;
}

/**
 * The sort after a press on the header of column `key`: the other
 * direction on the column already sorting, ascending on another one.
 */
export function nextSort(current: TableSort | undefined, key: string): TableSort {
  return current?.key === key
    ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
    : { key, direction: "ascending" };
}

/** Whether `value` is empty: such values go last, in either direction. */
function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * A copy of `rows`, objects, sorted by their value at `sort.key`. Numbers and dates
 * compare as such, the rest as text in the order of `locale`, with its
 * numbers in it ("item 2" before "item 10"). Empty values go last. Equal
 * rows keep their order.
 */
export function sortRows<Row extends object>(
  rows: readonly Row[],
  sort: TableSort,
  locale?: string,
): Row[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const sign = sort.direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = (a as Record<string, unknown>)[sort.key];
    const right = (b as Record<string, unknown>)[sort.key];
    if (isEmpty(left) || isEmpty(right)) {
      return Number(isEmpty(left)) - Number(isEmpty(right));
    }
    if (typeof left === "number" && typeof right === "number") {
      return sign * (left - right);
    }
    if (left instanceof Date && right instanceof Date) {
      return sign * (left.getTime() - right.getTime());
    }
    return sign * collator.compare(String(left), String(right));
  });
}
