/**
 * The pages a pagination shows, without DOM nor Lit (ADR 0010): the first,
 * the last, the current one and its neighbours, and a gap where pages are
 * left out.
 */

/** A page number, or a gap for the pages left out. */
export type PaginationItem = number | "gap";

/**
 * The items of a pagination at `page` among `pages`: every page when they
 * fit in `2 × siblings + 5` items, otherwise the first and last pages, the
 * `siblings` pages on each side of the current one, and a gap between. A
 * gap never stands for a single page: that page shows instead.
 */
export function paginationItems(page: number, pages: number, siblings = 1): PaginationItem[] {
  const count = Math.max(0, Math.floor(pages));
  if (count === 0) {
    return [];
  }
  const current = Math.min(Math.max(Math.round(page), 1), count);
  const slots = siblings * 2 + 5;
  if (count <= slots) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
  // The window around the current page, kept away from both ends.
  const start = Math.max(Math.min(current - siblings, count - siblings * 2 - 2), 3);
  const end = Math.min(Math.max(current + siblings, siblings * 2 + 3), count - 2);
  const items: PaginationItem[] = [1];
  items.push(start === 3 ? 2 : "gap");
  for (let item = start; item <= end; item++) {
    items.push(item);
  }
  items.push(end === count - 2 ? count - 1 : "gap");
  items.push(count);
  return items;
}
