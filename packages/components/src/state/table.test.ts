import { describe, expect, it } from "vitest";
import { nextSort, sortRows } from "./table.js";

describe("nextSort", () => {
  it("sorts a new column ascending, then the other way", () => {
    expect(nextSort(undefined, "name")).toEqual({ key: "name", direction: "ascending" });
    expect(nextSort({ key: "name", direction: "ascending" }, "name")).toEqual({
      key: "name",
      direction: "descending",
    });
    expect(nextSort({ key: "name", direction: "descending" }, "name")).toEqual({
      key: "name",
      direction: "ascending",
    });
    expect(nextSort({ key: "name", direction: "descending" }, "date")).toEqual({
      key: "date",
      direction: "ascending",
    });
  });
});

describe("sortRows", () => {
  const rows = [
    { name: "Élodie", count: 10, date: new Date("2026-03-01") },
    { name: "item 10", count: 2, date: new Date("2026-01-01") },
    { name: "", count: null, date: null },
    { name: "item 2", count: 33, date: new Date("2026-02-01") },
    { name: "emile", count: 2, date: new Date("2026-04-01") },
  ];
  const names = (sorted: typeof rows) => sorted.map((row) => row.name);

  it("compares text in the order of the language, numbers within it, without case nor accents", () => {
    expect(names(sortRows(rows, { key: "name", direction: "ascending" }, "fr"))).toEqual([
      "Élodie",
      "emile",
      "item 2",
      "item 10",
      "",
    ]);
  });

  it("compares numbers and dates as such, empty values last in either direction", () => {
    expect(names(sortRows(rows, { key: "count", direction: "descending" }))).toEqual([
      "item 2",
      "Élodie",
      "item 10",
      "emile",
      "",
    ]);
    expect(names(sortRows(rows, { key: "date", direction: "ascending" }))).toEqual([
      "item 10",
      "item 2",
      "Élodie",
      "emile",
      "",
    ]);
  });

  it("keeps the order of equal rows, and leaves the rows given unchanged", () => {
    const copy = [...rows];
    expect(names(sortRows(rows, { key: "count", direction: "ascending" }))).toEqual([
      "item 10",
      "emile",
      "Élodie",
      "item 2",
      "",
    ]);
    expect(rows).toEqual(copy);
  });
});
