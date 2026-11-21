// The values chosen among items, without a browser (ADR 0010).
import { expect, it } from "vitest";
import { orderedValues, toggleAll, toggleValue } from "./selection.ts";

const items = [{ value: "fr" }, { value: "be" }, { value: "ch", disabled: true }, { value: "ca" }];

it("keeps the order of the items, without unknown values", () => {
  expect(orderedValues(items, ["ca", "fr", "xx"])).toEqual(["fr", "ca"]);
});

it("chooses a value, or leaves it out, in the order of the items", () => {
  expect(toggleValue(items, ["ca"], "fr")).toEqual(["fr", "ca"]);
  expect(toggleValue(items, ["fr", "ca"], "fr")).toEqual(["ca"]);
});

it("doesn't change a disabled or unknown item", () => {
  const values = ["fr"];
  expect(toggleValue(items, values, "ch")).toBe(values);
  expect(toggleValue(items, values, "xx")).toBe(values);
});

it("chooses every enabled item, or none once they all are, and keeps the disabled ones", () => {
  const items = [{ value: "a" }, { value: "b", disabled: true }, { value: "c" }];
  expect(toggleAll(items, [])).toEqual(["a", "c"]);
  expect(toggleAll(items, ["a"])).toEqual(["a", "c"]);
  expect(toggleAll(items, ["a", "c"])).toEqual([]);
  expect(toggleAll(items, ["b"])).toEqual(["a", "b", "c"]);
  expect(toggleAll(items, ["a", "b", "c"])).toEqual(["b"]);
});
