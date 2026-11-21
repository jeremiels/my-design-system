// A composite renders the base's basic components, never the native element
// one of them wraps (ADR 0031): a brand's button changes every button of the
// catalog. Reads the templates of the sources, comments left out.
import { describe, expect, it } from "vitest";

const sources = import.meta.glob<string>(
  [
    "./{components,bases,controllers,mixins}/**/*.ts",
    "!./**/*.test.ts",
    "!./**/*.stories.ts",
    "!./**/*.type.ts",
  ],
  { query: "?raw", import: "default", eager: true },
);

/** A native element, and the basic component that renders it. */
const NATIVE: readonly { pattern: RegExp; native: string; component: string }[] = [
  { pattern: /<button\b/g, native: "<button>", component: "button" },
  {
    pattern: /<input\b[^>]*\btype="(?:checkbox|radio)"/g,
    native: '<input type="checkbox"> or "radio"',
    component: "checkbox, switch or radio",
  },
  { pattern: /<svg\b/g, native: "<svg>", component: "icon" },
  {
    pattern: /role="progressbar"/g,
    native: 'role="progressbar"',
    component: "spinner or progress",
  },
  { pattern: /<progress\b/g, native: "<progress>", component: "progress" },
];

/**
 * The files allowed to render a native element, and why: the basic
 * component itself, or an element that doesn't look like it.
 */
const ALLOWED: Record<string, Record<string, string>> = {
  "<button>": {
    "./components/button/button.ts": "The button itself.",
    "./components/table-header-cell/table-header-cell.ts":
      "The sort button is the text of the header, not a button to look at.",
  },
  '<input type="checkbox"> or "radio"': {
    "./bases/toggle/toggle-base.ts": "The control of checkbox and switch.",
    "./bases/choice-group/choice-group-base.ts": "The control of radio.",
  },
  "<svg>": {},
  'role="progressbar"': {
    "./components/spinner/spinner.ts": "The spinner itself.",
    "./components/progress/progress.ts": "The progress bar itself.",
  },
  "<progress>": {},
};

/** The source without its comments: JSDoc names native elements in backticks. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("composition", () => {
  it("reads the sources", () => {
    expect(Object.keys(sources)).toContain("./components/modal/modal.ts");
  });

  for (const { pattern, native, component } of NATIVE) {
    it(`renders ${native} only in the components allowed to`, () => {
      const found = Object.entries(sources)
        .filter(([, source]) => (code(source).match(pattern) ?? []).length > 0)
        .map(([file]) => file)
        .sort();
      const allowed = Object.keys(ALLOWED[native] ?? {}).sort();
      // A new file: render `${component}` with `tagFor()`, or add it to ALLOWED, with the reason.
      // A file gone: remove it from ALLOWED.
      expect(found, `Render ${component} with tagFor() instead of ${native}.`).toEqual(allowed);
    });
  }

  it("never writes the tag of another component: tagFor() follows the registration", () => {
    const found = Object.entries(sources)
      .filter(([, source]) => /<\/?u-[a-z]/.test(code(source)))
      .map(([file]) => file);
    expect(found).toEqual([]);
  });
});
