// Typeahead, without a browser (ADR 0010).
import { describe, expect, it } from "vitest";
import {
  emptyTypeahead,
  isTypeaheadKey,
  normalizeText,
  TYPEAHEAD_DELAY,
  typeahead,
} from "./typeahead.ts";

const cities = [
  { label: "Paris" },
  { label: "Pau" },
  { label: "Lyon" },
  { label: "Évry" },
  { label: "Perpignan", disabled: true },
  { label: "Pessac" },
];

describe("typeahead()", () => {
  it("finds the first item that starts with the text, after the active one", () => {
    expect(typeahead(emptyTypeahead, "l", 0, cities, -1).index).toBe(2);
    expect(typeahead(emptyTypeahead, "p", 0, cities, 0).index).toBe(1);
  });

  it("adds the keys typed in a row, and starts again after the delay", () => {
    const first = typeahead(emptyTypeahead, "p", 0, cities, -1);
    const second = typeahead(first.state, "e", 100, cities, first.index);
    expect(second.state.text).toBe("pe");
    expect(second.index).toBe(5);
    const later = typeahead(second.state, "l", 100 + TYPEAHEAD_DELAY + 1, cities, second.index);
    expect(later.state.text).toBe("l");
    expect(later.index).toBe(2);
  });

  it("moves to the next item that starts with a character typed again, looping", () => {
    let result = typeahead(emptyTypeahead, "p", 0, cities, -1);
    const visited = [result.index];
    for (let time = 100; time <= 300; time += 100) {
      result = typeahead(result.state, "p", time, cities, result.index);
      visited.push(result.index);
    }
    expect(visited).toEqual([0, 1, 5, 0]);
  });

  it("ignores case, accents and disabled items, and finds nothing past the last match", () => {
    expect(typeahead(emptyTypeahead, "e", 0, cities, -1).index).toBe(3);
    expect(typeahead(emptyTypeahead, "x", 0, cities, -1).index).toBe(-1);
    expect(typeahead({ text: "per", time: 0 }, "p", 10, cities, -1).index).toBe(-1);
  });
});

it("compares text without case nor accents", () => {
  expect(normalizeText("Évry")).toBe("evry");
});

describe("isTypeaheadKey()", () => {
  const key = (value: string, modifiers = {}) => ({
    key: value,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...modifiers,
  });

  it("takes a printable character without modifier", () => {
    expect(isTypeaheadKey(key("a"), emptyTypeahead, 0)).toBe(true);
    expect(isTypeaheadKey(key("é"), emptyTypeahead, 0)).toBe(true);
    expect(isTypeaheadKey(key("ArrowDown"), emptyTypeahead, 0)).toBe(false);
    expect(isTypeaheadKey(key("a", { ctrlKey: true }), emptyTypeahead, 0)).toBe(false);
  });

  it("takes Space only within a typed text", () => {
    expect(isTypeaheadKey(key(" "), emptyTypeahead, 0)).toBe(false);
    expect(isTypeaheadKey(key(" "), { text: "new", time: 0 }, 100)).toBe(true);
    expect(isTypeaheadKey(key(" "), { text: "new", time: 0 }, TYPEAHEAD_DELAY + 1)).toBe(false);
  });
});
