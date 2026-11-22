// The likely names of `check` (ADR 0047): TypeScript's spelling suggestion,
// as suggestions a person or an agent applies, never `--fix`. Node, on the
// base's documentation.
import { describe, expect, it } from "vitest";
import {
  checkMarkup,
  fixMarkup,
  formatDiagnostics,
  spellingDistance,
  spellingSuggestion,
  type Edit,
} from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

/** The text with the edits of a suggestion applied. */
const apply = (source: string, edits: readonly Edit[]) =>
  [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, { start, end, text: written }) => text.slice(0, start) + written + text.slice(end),
      source,
    );

/** The text each suggestion of `source` gives. */
const suggested = (source: string, file?: string) =>
  checkMarkup(socle, source, file ? { file } : {}).flatMap(({ rule, suggestions = [] }) =>
    suggestions.map(({ edits }) => `${rule}: ${apply(source, edits)}`),
  );

describe("spellingSuggestion()", () => {
  it("weighs a substitution 2, an insertion 1, a difference of case 0.1, like TypeScript", () => {
    expect(spellingDistance("primay", "primary")).toBe(1);
    expect(spellingDistance("varient", "variant")).toBe(2);
    expect(spellingDistance("Label", "label")).toBeCloseTo(0.1);
  });

  it("names the closest candidate under 0.4 of the length, or none", () => {
    expect(spellingSuggestion("primay", ["primary", "secondary"])).toBe("primary");
    expect(spellingSuggestion("clsoe", ["close", "chevron-up"])).toBe("close");
    // A swap costs 4 in four letters: over the threshold.
    expect(spellingSuggestion("stra", ["star"])).toBeUndefined();
    expect(spellingSuggestion("xy", ["xz"])).toBeUndefined();
  });
});

describe("the suggestions of check", () => {
  it("rename a tag in its start tag and in its end tag", () => {
    expect(suggested("<u-buton>Go</u-buton>")).toEqual([
      "unknown-element: <u-button>Go</u-button>",
    ]);
  });

  it("rename an attribute, a value, an event, a slot and an icon in place", () => {
    const lines = (source: string) =>
      suggested(source).map((text) => text.split(": ").slice(1).join(": "));
    expect(lines(`<u-button varient="primary">Go</u-button>`)).toEqual([
      `<u-button variant="primary">Go</u-button>`,
    ]);
    expect(lines(`<u-button variant='primay'>Go</u-button>`)).toEqual([
      `<u-button variant='primary'>Go</u-button>`,
    ]);
    expect(lines(`<u-modal label="x" @u-clse="close"></u-modal>`)).toEqual([
      `<u-modal label="x" @u-close="close"></u-modal>`,
    ]);
    expect(lines(`<u-tabs><u-tab slot=tabz>A</u-tab></u-tabs>`)).toEqual([
      `<u-tabs><u-tab slot=tab>A</u-tab></u-tabs>`,
    ]);
    expect(lines(`<u-icon name="clsoe"></u-icon>`)).toEqual([`<u-icon name="close"></u-icon>`]);
  });

  it("keep the offsets of a Vue file, whose self-closing tags have no end tag", () => {
    const vue = `<template>\n  <u-icn name="close" />\n  <u-button :varient="v">Go</u-button>\n</template>\n<style>\n.a { gap: var(--u-spacing-mdd); }\n</style>\n`;
    expect(suggested(vue, "Page.vue")).toEqual([
      `unknown-element: ${vue.replace("<u-icn ", "<u-icon ")}`,
      `unknown-attribute: ${vue.replace(":varient", ":variant")}`,
      `unknown-token: ${vue.replace("--u-spacing-mdd", "--u-spacing-md")}`,
    ]);
  });

  it("say it in the message, show it in the list, and never apply with --fix", () => {
    const source = `<u-button variant="primay">Go</u-button>`;
    const text = formatDiagnostics(checkMarkup(socle, source));
    expect(text).toContain('Did you mean "primary"? (invalid-value) [suggestion]');
    expect(fixMarkup(socle, source, { unsafe: true }).output).toBe(source);
  });
});
