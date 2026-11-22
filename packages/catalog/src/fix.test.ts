// The fixes of `check` (ADR 0045): safe ones, unsafe ones, and none when two
// tokens fit. Node, on the base's documentation.
import { describe, expect, it } from "vitest";
import { applyFixes, checkCss, fixMarkup, formatDiagnostics } from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

describe("the fixes of a problem", () => {
  it("are safe for a token with one value in every context, unsafe for one that follows a context", () => {
    const [spacing, duration] = checkCss(socle, ".a { padding: 16px; transition: color 150ms; }");
    expect(spacing!.fix).toEqual({ start: 14, end: 18, text: "var(--u-spacing-md)", safe: true });
    // The token is 0ms with reduced motion: the page changes there.
    expect(duration!.fix).toMatchObject({ text: "var(--u-motion-duration-fast)", safe: false });
  });

  it("is unsafe for a color of the property's role, and none when two tokens fit", () => {
    // The token follows the dark theme: the page changes there, as intended.
    const [border] = checkCss(socle, ".a { border-color: #c4c4c4; }");
    expect(border!.fix).toEqual({
      start: 19,
      end: 26,
      text: "var(--u-color-border-default)",
      safe: false,
    });
    const [near] = checkCss(socle, ".a { border-color: #d6d6d6; }");
    expect(near!.fix).toBeUndefined();
    const [text] = checkCss(socle, ".a { color: #fff; }");
    expect(text!.fix).toBeUndefined();
    const [primitive] = checkCss(socle, ".a { color: var(--u-palette-brand-600); }");
    expect(primitive!.fix).toBeUndefined();
  });

  it("has none in a style attribute, nor in a value with a comment", () => {
    expect(
      checkCss(socle, "padding: 16px", { at: { line: 1, column: 1 } })[0]!.fix,
    ).toBeUndefined();
    expect(checkCss(socle, ".a { padding: 16px /* c */; }")[0]!.fix).toBeUndefined();
  });

  it("is marked in the diagnostics, with a count", () => {
    const text = formatDiagnostics(checkCss(socle, ".a { padding: 16px; transition: 150ms; }"));
    expect(text).toContain("(raw-value) [fix]");
    expect(text).toContain("(raw-value) [unsafe fix]");
    expect(text).toContain("0 errors, 2 warnings. Fixes: 1 safe, 1 unsafe.");
  });
});

describe("fixMarkup()", () => {
  it("applies the safe fixes, and the unsafe ones when asked", () => {
    const css = ".a {\n  padding: 16px 1.5rem;\n  transition: color 150ms;\n}\n";
    const safe = fixMarkup(socle, css, { file: "app.css" });
    expect(safe.output).toBe(
      ".a {\n  padding: var(--u-spacing-md) var(--u-spacing-lg);\n  transition: color 150ms;\n}\n",
    );
    expect(safe.fixed).toBe(2);
    expect(safe.diagnostics.map(({ rule }) => rule)).toEqual(["raw-value"]);
    const all = fixMarkup(socle, css, { file: "app.css", unsafe: true });
    expect(all.output).toContain("transition: color var(--u-motion-duration-fast);");
    expect(all.diagnostics).toEqual([]);
  });

  it("fixes the CSS of a Vue component in place, the rest of the file untouched", () => {
    const vue = "<template>\n  <p>Hi</p>\n</template>\n\n<style>\n.a { gap: 8px; }\n</style>\n";
    expect(fixMarkup(socle, vue, { file: "Page.vue" }).output).toBe(
      vue.replace("gap: 8px", "gap: var(--u-spacing-sm)"),
    );
  });

  it("applies fixes that don't overlap, and leaves the others to the next pass", () => {
    expect(
      applyFixes("abcdef", [
        { start: 1, end: 3, text: "X", safe: true },
        { start: 2, end: 4, text: "Y", safe: true },
        { start: 4, end: 5, text: "Z", safe: true },
      ]),
    ).toEqual({ output: "aXdZf", applied: 2 });
  });
});
