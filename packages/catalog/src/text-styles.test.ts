// The text styles (ADR 0051): a `typography` token, its class and its
// `font` shorthand, in the docs, in `check`, and in a design system's view.
// Node, on the base's documentation.
import { describe, expect, it } from "vitest";
import { checkCss, checkMarkup, extendDocs, findToken, formatToken } from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

describe("a text style", () => {
  it("is a token found by its class, with its parts", () => {
    const heading = findToken(socle, "u-text-heading-xl")!;
    expect(heading).toMatchObject({
      id: "text.heading.xl",
      type: "typography",
      className: "u-text-heading-xl",
      value: '600 2rem/1.25 "Helvetica Neue", sans-serif',
    });
    expect(heading.parts!["font-size"]).toBe("font.size.2xl");
    expect(socle.tokens.filter(({ type }) => type === "typography").map(({ id }) => id)).toEqual([
      "text.heading.xl",
      "text.heading.lg",
      "text.heading.md",
      "text.heading.sm",
      "text.body.md",
      "text.body.sm",
    ]);
  });

  it("gives its class, its CSS and its parts, with the rules of the text styles", () => {
    const text = formatToken(socle, findToken(socle, "text.body.sm")!);
    expect(text).toContain('In HTML: `class="u-text-body-sm"`.');
    expect(text).toContain(
      "In CSS: `font: var(--u-text-body-sm)`, and `letter-spacing: var(--u-font-letter-spacing-normal)`.",
    );
    expect(text).toContain("## Parts\n\n- font-family: `--u-font-family-body`");
    expect(text).toContain("N'écrivez pas une classe de style de texte qui n'existe pas");
  });
});

describe("check, on the text styles", () => {
  it("fails on a class under the prefix that names no text style, with a suggestion", () => {
    const source = `<h1 class="page u-text-heading-xxl">Demandes</h1>`;
    const [problem, ...others] = checkMarkup(socle, source);
    expect(others).toEqual([]);
    expect(problem).toMatchObject({
      rule: "unknown-text-style",
      severity: "error",
      message:
        'Unicorne has no text style "u-text-heading-xxl": the class sets nothing. Did you mean "u-text-heading-xl"?',
    });
    const [edit] = problem!.suggestions![0]!.edits;
    expect(source.slice(edit!.start, edit!.end)).toBe("u-text-heading-xxl");
    expect(edit!.text).toBe("u-text-heading-xl");
  });

  it("leaves a text style, another class, and a bound class", () => {
    expect(
      checkMarkup(socle, `<h2 class="u-text-heading-xl title">A</h2><p class="text-muted">B</p>`),
    ).toEqual([]);
    expect(
      checkMarkup(socle, "const view = html`<p class=${'u-text-nope'}>B</p>`;", { file: "a.ts" }),
    ).toEqual([]);
  });

  it("gives the text style of a raw font shorthand, as a fix", () => {
    const [problem] = checkCss(socle, '.a { font: 600 2rem/1.25 "Helvetica Neue", sans-serif; }');
    expect(problem).toMatchObject({
      rule: "raw-value",
      message:
        '`600 2rem/1.25 "Helvetica Neue", sans-serif` in font: use `var(--u-text-heading-xl)`.',
      fix: { text: "var(--u-text-heading-xl)" },
    });
  });
});

describe("the text styles of a design system", () => {
  const acme = extendDocs(socle, { name: "ACME", prefix: "acme", package: "@acme/design-system" });

  it("have its prefix, in its tokens and in its rules", () => {
    expect(findToken(acme, "text.body.sm")!.className).toBe("acme-text-body-sm");
    const statements = acme.tokenGroups
      .find(({ name }) => name === "text")!
      .guidelines.map(({ statement }) => statement)
      .join("\n");
    expect(statements).toContain("une classe comme `acme-text-body-sm`");
    expect(statements).not.toMatch(/`u-text/);
  });

  it("are checked under its prefix", () => {
    expect(
      checkMarkup(acme, `<p class="acme-text-body-sm u-text-body-sm">A</p>`).map(
        ({ rule }) => rule,
      ),
    ).toEqual([]);
    expect(
      checkMarkup(acme, `<p class="acme-text-bdy-sm">A</p>`).map(({ message }) => message),
    ).toEqual([
      'ACME has no text style "acme-text-bdy-sm": the class sets nothing. Did you mean "acme-text-body-sm"?',
    ]);
  });
});
