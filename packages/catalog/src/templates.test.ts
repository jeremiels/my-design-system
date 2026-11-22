// `check` on the Lit templates of a script (ADR 0048): the `html` and `css`
// tagged templates, nested ones too, at their place in the file. Node, on
// the base's documentation.
import { describe, expect, it } from "vitest";
import { checkCss, checkMarkup, fixMarkup, scriptTemplates } from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

const script = [
  'import { html, css } from "lit";',
  "const re = /`not a template`/g; // a regex, and a comment with a `backtick`",
  "const half = 10 / 2;",
  "const text = 'a `quoted` backtick';",
  "export const styles = css`",
  "  :host { padding: 16px; color: ${color}; }",
  "`;",
  "export const view = (items, tag) => html`<section ${ref(box)}>",
  '  <u-button variant="primay" .disabled=${false} @click=${() => go({ a: 1 })}>Go</u-button>',
  '  <u-button variant="${current}">Bound</u-button>',
  '  ${items.map((item) => html`<u-icon name="clsoe"></u-icon>${item}`)}',
  "  <${tag}>dynamic</${tag}>",
  "</section>`;",
].join("\n");

describe("scriptTemplates()", () => {
  it("finds the html and css templates, nested ones too, not a regex, a string or a comment", () => {
    const templates = scriptTemplates(script);
    expect(templates.map(({ kind }) => kind)).toEqual(["css", "html", "html"]);
    expect(templates[2]!.text).toBe('<u-icon name="clsoe"></u-icon>${____}');
  });

  it("replaces each expression by a placeholder of its length", () => {
    const [styles, view] = scriptTemplates(script);
    expect(styles!.text).toContain("color: /*____*/;");
    const marker = (expression: string) => `\${${"_".repeat(expression.length - 3)}}`;
    expect(view!.text).toContain(
      `.disabled=${marker("${false}")} @click=${marker("${() => go({ a: 1 })}")}>`,
    );
    expect(script.slice(view!.offset, view!.offset + view!.text.length).length).toBe(
      view!.text.length,
    );
  });
});

describe("check on a script", () => {
  it("reports at the line and the column of the file, in nested templates too", () => {
    expect(
      checkMarkup(socle, script, { file: "view.ts" }).map(
        ({ line, column, rule }) => `${line}:${column} ${rule}`,
      ),
    ).toEqual(["6:11 raw-value", "9:13 invalid-value", "11:38 unknown-icon"]);
  });

  it("leaves bound values, element expressions and dynamic tags", () => {
    const rules = checkMarkup(socle, script, { file: "view.ts" }).map(({ rule }) => rule);
    expect(rules).not.toContain("unknown-attribute");
    expect(rules).not.toContain("unknown-element");
  });

  it("fixes and suggests in the file itself", () => {
    const fixed = fixMarkup(socle, script, { file: "view.ts" }).output;
    expect(fixed).toContain(":host { padding: var(--u-spacing-md); color: ${color}; }");
    const [, value] = checkMarkup(socle, script, { file: "view.ts" });
    const [edit] = value!.suggestions![0]!.edits;
    expect(script.slice(edit!.start, edit!.end)).toBe("primay");
  });

  it("reads no template in a declaration file", () => {
    expect(checkMarkup(socle, script, { file: "view.d.ts" })).toEqual([]);
  });
});

describe("what check leaves", () => {
  it("leaves the CSS of forced colors, and the fallback of a var()", () => {
    expect(
      checkCss(
        socle,
        "@media (forced-colors: active) { .a { border: 1px solid CanvasText; } }\n" +
          ".b { background-color: var(--u-color-backdrop, hsl(0deg 0% 0% / 50%)); }",
      ),
    ).toEqual([]);
  });

  it("leaves a listener of an event that another component fires and that bubbles", () => {
    const rules = checkMarkup(
      socle,
      `<u-tag-group label="Filters" @u-remove="remove"><u-tag removable>Paris</u-tag></u-tag-group>`,
    ).map(({ rule }) => rule);
    expect(rules).not.toContain("unknown-event");
  });
});
