// `check` on CSS: the tokens of the design system in an application's style
// sheets (ADR 0043). Node, on the base's documentation.
import { describe, expect, it } from "vitest";
import {
  checkCss,
  checkMarkup,
  colorDistance,
  extendDocs,
  parseColor,
  searchTokens,
  type CssRule,
} from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

/** The problems of a style sheet, as `line rule: message`. */
const problems = (css: string) =>
  checkCss(socle, css).map(({ line, rule, message }) => `${line} ${rule}: ${message}`);

describe("unknown-token", () => {
  it("fails on a custom property of the design system that names no token", () => {
    const [problem] = problems(".a { gap: var(--u-spacing-medium); }");
    expect(problem).toContain("1 unknown-token: Unicorne has no token `--u-spacing-medium`.");
    expect(problem).toContain("Its group has `--u-spacing-2xs`");
    expect(checkCss(socle, ".a { gap: var(--u-spacing-medium); }")[0]!.severity).toBe("error");
  });

  it("leaves the application's own properties, and knows every token and component property", () => {
    expect(
      problems(
        ".a { gap: var(--app-gap, var(--u-spacing-md)); color: var(--u-button-foreground-color); }",
      ),
    ).toEqual([]);
  });
});

describe("primitive-token", () => {
  it("sends a primitive to the semantic tokens of its intent", () => {
    expect(problems(".a { background: var(--u-palette-brand-600); }")).toEqual([
      "1 primitive-token: `--u-palette-brand-600` is a primitive: use the semantic token of the intent, `var(--u-color-action-background)`, `var(--u-color-focus-ring)`.",
    ]);
  });
});

describe("raw-value", () => {
  it("gives the token of each raw value a semantic token holds", () => {
    expect(
      problems(`.a {
  padding: 16px 1.5rem;
  border-radius: 4px;
  font-weight: 600;
  transition: color 150ms ease;
}`),
    ).toEqual([
      "2 raw-value: `16px` in padding: use `var(--u-spacing-md)`.",
      "2 raw-value: `1.5rem` in padding: use `var(--u-spacing-lg)`.",
      "3 raw-value: `4px` in border-radius: use `var(--u-radius-md)`.",
      "4 raw-value: `600` in font-weight: use `var(--u-font-weight-semibold)`.",
      "5 raw-value: `150ms` in transition: use `var(--u-motion-duration-fast)`.",
    ]);
  });

  it("leaves the values no token holds, keywords, and the application's properties", () => {
    expect(
      problems(`.a {
  margin: 0 auto;
  width: 16px;
  padding: 13px;
  color: currentColor;
  background: transparent;
  --app-accent: #123456;
}`),
    ).toEqual([]);
  });

  it("gives a whole shadow its token, without a second problem for its color", () => {
    expect(problems(".a { box-shadow: 0px 4px 12px #00000029; }")).toEqual([
      "1 raw-value: `0px 4px 12px #00000029` in box-shadow: use `var(--u-shadow-raised)`.",
    ]);
  });

  it("gives a raw color the token of its role, or the nearest ones", () => {
    const [exact] = problems(".a { border-color: #ffffff; color: #ffffff; }");
    expect(exact).toContain("`#ffffff` in border-color: a raw color doesn't follow the dark theme");
    expect(problems(".a { color: #fff; }")[0]).toContain(
      "`#fff` in color: use the token of its intent, `var(--u-color-action-text)`",
    );
    const [near] = problems(".a { border: 1px solid #d0d0d0; }").slice(1);
    expect(near).toContain(
      "`#d0d0d0` in border: a raw color doesn't follow the dark theme. Nearest tokens for border: `var(--u-color-border-default)` (ΔE 3.7)",
    );
    const [other] = problems(".a { color: rgb(28, 101, 200); }");
    expect(other).toContain(
      "`var(--u-color-action-background)`, `var(--u-color-focus-ring)` hold it, for another use. Nearest tokens for color: `var(--u-color-action-foreground)`",
    );
  });
});

describe("the CSS of a file", () => {
  it("checks a CSS file, the CSS blocks of a Vue component and every style attribute", () => {
    const vue = [
      "<template>",
      '  <div style="margin: 8px">Hi</div>',
      "</template>",
      "",
      "<style scoped>",
      ".a { gap: var(--u-gap); }",
      "</style>",
      '<style lang="scss">',
      ".b { color: $brand; }",
      "</style>",
    ].join("\n");
    expect(
      checkMarkup(socle, vue, { file: "Page.vue" }).map(
        ({ line, column, rule }) => `${line}:${column} ${rule}`,
      ),
    ).toEqual(["2:8 raw-value", "6:6 unknown-token"]);
    expect(checkMarkup(socle, ".a { padding: 16px; }", { file: "app.css" })[0]).toMatchObject({
      file: "app.css",
      rule: "raw-value",
    });
    expect(checkMarkup(socle, '<p style="color: #fff">x</p>')[0]!.rule).toBe("raw-value");
  });

  it("reports CSS that doesn't parse", () => {
    expect(checkCss(socle, ".a { color: red", { file: "app.css" })[0]).toMatchObject({
      rule: "css-syntax",
      severity: "error",
      line: 1,
    });
  });

  it("takes a design system's rules, and leaves out those it removes", () => {
    const noImportant: CssRule = {
      id: "no-important",
      description: "No !important.",
      check: ({ value, line, column }, { report }) => {
        if (value.includes("!")) {
          report({ severity: "error", message: "No !important.", line, column });
        }
      },
    };
    const acme = extendDocs(socle, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
      cssRules: [noImportant],
      withoutRules: ["raw-value"],
    });
    expect(acme.cssRules.map(({ id }) => id)).toEqual([
      "unknown-token",
      "primitive-token",
      "token-pair",
      "no-important",
    ]);
    expect(checkCss(acme, ".a { padding: 16px; }")).toEqual([]);
  });
});

describe("colors", () => {
  it("reads the colors CSS writes, and measures their distance in OKLab", () => {
    expect(parseColor("#1c65c8")).toEqual(parseColor("rgb(28, 101, 200)"));
    expect(parseColor("rgb(28 101 200 / 50%)")!.alpha).toBe(0.5);
    expect(colorDistance(parseColor("white")!, parseColor("hsl(0, 0%, 100%)")!)).toBeLessThan(0.01);
    expect(parseColor("red")).toBeUndefined();
    expect(colorDistance(parseColor("#000")!, parseColor("#fff")!)).toBeCloseTo(100, 0);
  });

  it("finds the nearest semantic colors of a color no token holds", () => {
    const [first] = searchTokens(socle, "#1d66ca");
    expect(first!.token.id).toBe("color.action.background");
    expect(first!.matches[0]).toMatch(/^nearest color \(ΔE 0\.\d\)$/);
    expect(searchTokens(socle, "rgb(28, 101, 200)")[0]!.matches).toEqual(["value"]);
  });
});
