// The values chosen among items, without a browser (ADR 0010).
import { expect, it } from "vitest";
import { orderedValues, toggleValue } from "./selection.ts";

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
