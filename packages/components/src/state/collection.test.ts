// The active item of a collection, without a browser (ADR 0010).
import { describe, expect, it } from "vitest";
import { collectionKeyMove, enabledIndexes, moveIndex } from "./collection.ts";

const items = [{}, { disabled: true }, {}, {}];

describe("moveIndex()", () => {
  it("moves to the next and previous enabled item", () => {
    expect(moveIndex(items, 0, "next")).toBe(2);
    expect(moveIndex(items, 2, "next")).toBe(3);
    expect(moveIndex(items, 3, "previous")).toBe(2);
    expect(moveIndex(items, 2, "previous")).toBe(0);
  });

  it("loops at the ends", () => {
    expect(moveIndex(items, 3, "next")).toBe(0);
    expect(moveIndex(items, 0, "previous")).toBe(3);
  });

  it("enters the collection at its first or last enabled item", () => {
    expect(moveIndex(items, -1, "next")).toBe(0);
    expect(moveIndex(items, -1, "previous")).toBe(3);
    expect(moveIndex([{ disabled: true }, {}], -1, "first")).toBe(1);
    expect(moveIndex([{}, { disabled: true }], -1, "last")).toBe(0);
  });

  it("has no active item after `none`, or without an enabled item", () => {
    expect(moveIndex(items, 2, "none")).toBe(-1);
    expect(moveIndex([{ disabled: true }], -1, "first")).toBe(-1);
    expect(moveIndex([], -1, "next")).toBe(-1);
  });
});

it("lists the indexes of the enabled items", () => {
  expect(enabledIndexes(items)).toEqual([0, 2, 3]);
});

describe("collectionKeyMove()", () => {
  it("maps ArrowDown and ArrowUp in a vertical collection, and no other arrow", () => {
    const vertical = { axis: "vertical" } as const;
    expect(collectionKeyMove("ArrowDown", vertical)).toBe("next");
    expect(collectionKeyMove("ArrowUp", vertical)).toBe("previous");
    expect(collectionKeyMove("ArrowRight", vertical)).toBeUndefined();
    expect(collectionKeyMove("Enter", vertical)).toBeUndefined();
  });

  it("maps ArrowRight and ArrowLeft in a horizontal collection, along the text", () => {
    expect(collectionKeyMove("ArrowRight", { axis: "horizontal" })).toBe("next");
    expect(collectionKeyMove("ArrowLeft", { axis: "horizontal" })).toBe("previous");
    expect(collectionKeyMove("ArrowDown", { axis: "horizontal" })).toBeUndefined();
    const rtl = { axis: "horizontal", direction: "rtl" } as const;
    expect(collectionKeyMove("ArrowLeft", rtl)).toBe("next");
    expect(collectionKeyMove("ArrowRight", rtl)).toBe("previous");
  });

  it("maps the four arrows on both axes", () => {
    const both = { axis: "both" } as const;
    expect(collectionKeyMove("ArrowDown", both)).toBe("next");
    expect(collectionKeyMove("ArrowRight", both)).toBe("next");
    expect(collectionKeyMove("ArrowUp", both)).toBe("previous");
    expect(collectionKeyMove("ArrowLeft", both)).toBe("previous");
  });

  it("maps Home and End only when asked: they move the caret of an input", () => {
    expect(collectionKeyMove("Home", { axis: "vertical" })).toBeUndefined();
    expect(collectionKeyMove("Home", { axis: "vertical", homeEnd: true })).toBe("first");
    expect(collectionKeyMove("End", { axis: "vertical", homeEnd: true })).toBe("last");
  });
});
