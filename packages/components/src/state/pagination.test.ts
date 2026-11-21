// The pages a pagination shows, without a browser (ADR 0010).
import { expect, it } from "vitest";
import { paginationItems } from "./pagination.ts";

it("shows every page when they fit", () => {
  expect(paginationItems(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(paginationItems(3, 1)).toEqual([1]);
  expect(paginationItems(1, 0)).toEqual([]);
});

it("shows the ends, the current page and its neighbours, with gaps", () => {
  expect(paginationItems(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  expect(paginationItems(10, 20, 2)).toEqual([1, "gap", 8, 9, 10, 11, 12, "gap", 20]);
});

it("keeps the same number of items near the ends, and no gap for a single page", () => {
  expect(paginationItems(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  expect(paginationItems(4, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
  expect(paginationItems(5, 20)).toEqual([1, "gap", 4, 5, 6, "gap", 20]);
  expect(paginationItems(17, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
  expect(paginationItems(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
});

it("brings a page out of bounds back in", () => {
  expect(paginationItems(99, 20)).toEqual(paginationItems(20, 20));
  expect(paginationItems(-3, 20)).toEqual(paginationItems(1, 20));
});
