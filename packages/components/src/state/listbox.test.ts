// The active option of a list, without a browser (ADR 0010).
import { describe, expect, it } from "vitest";
import { enabledIndexes, listboxKeyMove, moveActiveIndex } from "./listbox.ts";

const items = [{}, { disabled: true }, {}, {}];

describe("moveActiveIndex()", () => {
  it("moves to the next and previous enabled option", () => {
    expect(moveActiveIndex(items, 0, "next")).toBe(2);
    expect(moveActiveIndex(items, 2, "next")).toBe(3);
    expect(moveActiveIndex(items, 3, "previous")).toBe(2);
    expect(moveActiveIndex(items, 2, "previous")).toBe(0);
  });

  it("loops at the ends", () => {
    expect(moveActiveIndex(items, 3, "next")).toBe(0);
    expect(moveActiveIndex(items, 0, "previous")).toBe(3);
  });

  it("enters the list at its first or last enabled option", () => {
    expect(moveActiveIndex(items, -1, "next")).toBe(0);
    expect(moveActiveIndex(items, -1, "previous")).toBe(3);
    expect(moveActiveIndex([{ disabled: true }, {}], -1, "first")).toBe(1);
    expect(moveActiveIndex([{}, { disabled: true }], -1, "last")).toBe(0);
  });

  it("has no active option after `none`, or without an enabled option", () => {
    expect(moveActiveIndex(items, 2, "none")).toBe(-1);
    expect(moveActiveIndex([{ disabled: true }], -1, "first")).toBe(-1);
    expect(moveActiveIndex([], -1, "next")).toBe(-1);
  });
});

it("lists the indexes of the enabled options", () => {
  expect(enabledIndexes(items)).toEqual([0, 2, 3]);
});

it("maps the arrow keys to a move, and no other key", () => {
  expect(listboxKeyMove("ArrowDown")).toBe("next");
  expect(listboxKeyMove("ArrowUp")).toBe("previous");
  expect(listboxKeyMove("Enter")).toBeUndefined();
});
