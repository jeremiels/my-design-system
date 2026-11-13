import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build, defineConfig, parse } from "@terrazzo/parser";
import { afterEach, describe, expect, it } from "vitest";
import { tokensCss, type TokensCssOptions } from "./terrazzo-plugin.ts";

const color = (hex: string) => ({
  $type: "color",
  $value: {
    colorSpace: "srgb",
    components: [1, 2, 3].map((i) => parseInt(hex.slice(i * 2 - 1, i * 2 + 1), 16) / 255),
    hex,
  },
});

/** A small base: a palette, two themes, reduced motion, a button and its danger variant. */
const BASE = {
  "base/primitive.tokens.json": {
    palette: {
      brand: { 300: color("#9cc6ff"), 600: color("#1c65c8") },
      danger: { 600: color("#b6322d") },
    },
    duration: {
      $type: "duration",
      0: { $value: { value: 0, unit: "ms" } },
      150: { $value: { value: 150, unit: "ms" } },
    },
  },
  "base/semantic.tokens.json": {
    motion: { duration: { fast: { $value: "{duration.150}" } } },
  },
  "base/light.tokens.json": { color: { action: { $value: "{palette.brand.600}" } } },
  "base/dark.tokens.json": { color: { action: { $value: "{palette.brand.300}" } } },
  "base/reduced.tokens.json": { motion: { duration: { fast: { $value: "{duration.0}" } } } },
  "base/button.tokens.json": {
    button: {
      background: { $value: "{color.action}", $description: "Background." },
      duration: { $value: "{motion.duration.fast}", $description: "Transition." },
    },
  },
  "base/button.danger.tokens.json": { button: { background: { $value: "{color.danger}" } } },
  "base/danger.tokens.json": { color: { danger: { $value: "{palette.danger.600}" } } },
};

function resolverFor(files: {
  primitive?: string[];
  semantic?: string[];
  component?: string[];
  light?: string[];
  dark?: string[];
  reduced?: string[];
  danger?: string[];
}) {
  const refs = (list: string[] = []) => list.map(($ref) => ({ $ref }));
  return {
    name: "test",
    version: "2025.10",
    sets: {
      primitive: { sources: refs(files.primitive) },
      semantic: { sources: refs(files.semantic) },
      component: { sources: refs(files.component) },
    },
    modifiers: {
      theme: { default: "light", contexts: { light: refs(files.light), dark: refs(files.dark) } },
      motion: { default: "full", contexts: { full: [], reduced: refs(files.reduced) } },
      "button-variant": {
        default: "primary",
        contexts: { primary: [], danger: refs(files.danger) },
      },
    },
    resolutionOrder: [
      { $ref: "#/sets/primitive" },
      { $ref: "#/sets/semantic" },
      { $ref: "#/modifiers/theme" },
      { $ref: "#/modifiers/motion" },
      { $ref: "#/sets/component" },
      { $ref: "#/modifiers/button-variant" },
    ],
  };
}

const BASE_RESOLVER = resolverFor({
  primitive: ["base/primitive.tokens.json"],
  semantic: ["base/semantic.tokens.json"],
  component: ["base/button.tokens.json"],
  light: ["base/light.tokens.json", "base/danger.tokens.json"],
  dark: ["base/dark.tokens.json", "base/danger.tokens.json"],
  reduced: ["base/reduced.tokens.json"],
  danger: ["base/button.danger.tokens.json"],
});

const BASE_OPTIONS: TokensCssOptions = {
  layer: "u.tokens.base",
  page: "tokens.css",
  components: {
    button: { file: "button.tokens.css", attributes: { "button-variant": "variant" } },
  },
};

let directories: string[] = [];
afterEach(() => {
  for (const directory of directories) {
    rmSync(directory, { recursive: true, force: true });
  }
  directories = [];
});

/** Runs Terrazzo with the plugin on these files: the CSS sheets, by name. */
async function run(
  files: Record<string, unknown>,
  options: TokensCssOptions = BASE_OPTIONS,
): Promise<Record<string, string>> {
  const directory = mkdtempSync(join(tmpdir(), "tokens-css-"));
  directories.push(directory);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, name)), { recursive: true });
    writeFileSync(join(directory, name), JSON.stringify(content));
  }
  const resolver = join(directory, "test.resolver.json");
  const config = defineConfig(
    { tokens: ["./test.resolver.json"], outDir: "./out/", plugins: [tokensCss(options)] },
    { cwd: pathToFileURL(`${directory}/`) },
  );
  const parsed = await parse(
    [{ filename: pathToFileURL(resolver), src: readFileSync(resolver, "utf8") }],
    {
      config,
    },
  );
  const { outputFiles } = await build(parsed.tokens, { ...parsed, config });
  return Object.fromEntries(
    outputFiles.map(({ filename, contents }) => [filename, String(contents)]),
  );
}

/** The declarations of the rule with exactly these selectors, as `name: value` lines. */
function block(css: string, selectors: string): string[] {
  const start = css.indexOf(`${selectors} {\n`);
  expect(start, `rule ${selectors}`).toBeGreaterThan(-1);
  const body = css.slice(start + selectors.length + 3, css.indexOf("}", start));
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("the base's sheets", () => {
  it("puts primitives on :root and semantic tokens on :root and [data-brand], in the layer", async () => {
    const { "tokens.css": css } = await run({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    expect(css).toMatch(/^\/\* Generated from .*\*\/\n@layer u\.tokens\.base \{\n/);
    expect(block(css!, "  :root")).toEqual([
      "--u-palette-brand-300: #9cc6ff;",
      "--u-palette-brand-600: #1c65c8;",
      "--u-palette-danger-600: #b6322d;",
      "--u-duration-0: 0ms;",
      "--u-duration-150: 150ms;",
    ]);
    expect(block(css!, "  :root,\n  [data-brand]")).toEqual([
      "--u-motion-duration-fast: var(--u-duration-150);",
      "--u-color-action: var(--u-palette-brand-600);",
      "--u-color-danger: var(--u-palette-danger-600);",
    ]);
  });

  it("gives the dark context its two selectors, and reduced motion its media query", async () => {
    const { "tokens.css": css } = await run({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    const dark = [
      "--u-color-action: var(--u-palette-brand-300);",
      "--u-color-danger: var(--u-palette-danger-600);",
    ];
    expect(css).toContain(
      '  @media (prefers-color-scheme: dark) {\n    :root:not([data-theme="light"]),\n    :root:not([data-theme="light"]) [data-brand] {',
    );
    expect(
      block(
        css!,
        '    :root:not([data-theme="light"]),\n    :root:not([data-theme="light"]) [data-brand]',
      ),
    ).toEqual(dark);
    expect(
      block(css!, '  :root[data-theme="dark"],\n  :root[data-theme="dark"] [data-brand]'),
    ).toEqual(dark);
    expect(css).toContain(
      "  @media (prefers-reduced-motion: reduce) {\n    :root,\n    [data-brand] {",
    );
    expect(block(css!, "    :root,\n    [data-brand]")).toEqual([
      "--u-motion-duration-fast: var(--u-duration-0);",
    ]);
  });

  it("gives a component its tokens on :host, and each variant only the tokens it changes", async () => {
    const { "button.tokens.css": css } = await run({
      ...BASE,
      "test.resolver.json": BASE_RESOLVER,
    });
    expect(css).not.toContain("@layer");
    expect(block(css!, ":host")).toEqual([
      "--u-button-background: var(--u-color-action);",
      "--u-button-duration: var(--u-motion-duration-fast);",
    ]);
    expect(block(css!, ':host([variant="danger"])')).toEqual([
      "--u-button-background: var(--u-color-danger);",
    ]);
  });
});

describe("the base's build, split across its packages (ADR 0003)", () => {
  it("outputs the page sheet only, without the components option", async () => {
    const files = await run(
      { ...BASE, "test.resolver.json": BASE_RESOLVER },
      { layer: "u.tokens.base", page: "tokens.css" },
    );
    expect(Object.keys(files)).toEqual(["tokens.css"]);
    expect(files["tokens.css"]).not.toContain("--u-button-");
  });

  it("outputs the component sheets only, without the page option", async () => {
    const files = await run(
      { ...BASE, "test.resolver.json": BASE_RESOLVER },
      { components: BASE_OPTIONS.components },
    );
    expect(Object.keys(files)).toEqual(["button.tokens.css"]);
  });

  it("fails the build for a page sheet without a layer", async () => {
    await expect(
      run({ ...BASE, "test.resolver.json": BASE_RESOLVER }, { page: "tokens.css" }),
    ).rejects.toThrow("option layer");
  });
});

describe("a brand's sheets", () => {
  const BRAND = {
    ...BASE,
    "brand/primitive.tokens.json": { palette: { brand: { 600: color("#801acc") } } },
    "brand/light.tokens.json": { color: { action: { $value: "{palette.brand.300}" } } },
    "brand/button.tokens.json": { button: { duration: { $value: "{motion.duration.fast}" } } },
    "brand/card.tokens.json": {
      card: { background: { $value: "{color.action}", $description: "Background." } },
    },
  };
  const BRAND_RESOLVER = resolverFor({
    primitive: ["base/primitive.tokens.json", "brand/primitive.tokens.json"],
    semantic: ["base/semantic.tokens.json"],
    component: ["base/button.tokens.json", "brand/button.tokens.json", "brand/card.tokens.json"],
    light: ["base/light.tokens.json", "base/danger.tokens.json", "brand/light.tokens.json"],
    dark: ["base/dark.tokens.json", "base/danger.tokens.json"],
    reduced: ["base/reduced.tokens.json"],
    danger: ["base/button.danger.tokens.json"],
  });
  const BRAND_OPTIONS: TokensCssOptions = {
    layer: "u.tokens.brand",
    scope: '[data-brand="acme"]',
    page: "theme.css",
    components: {
      button: { file: "acme-button.tokens.css", attributes: { "button-variant": "variant" } },
      card: { file: "acme-card.tokens.css", prefix: "acme" },
    },
    emit: (file) => file.includes("/brand/"),
  };

  it("outputs only the brand's tokens, on its scope", async () => {
    const files = await run({ ...BRAND, "test.resolver.json": BRAND_RESOLVER }, BRAND_OPTIONS);
    const css = files["theme.css"]!;
    expect(css).toContain("@layer u.tokens.brand {");
    expect(block(css, '  [data-brand="acme"]').slice(0, 1)).toEqual([
      "--u-palette-brand-600: #801acc;",
    ]);
    expect(css).not.toContain("--u-palette-danger-600");
    expect(css).not.toContain("--u-motion-duration-fast");
  });

  it("outputs every theme of a semantic token it changes in one theme", async () => {
    // Its light value alone, in the brand's layer, would win over the base's
    // dark value: the plugin outputs the dark value too.
    const css = (await run({ ...BRAND, "test.resolver.json": BRAND_RESOLVER }, BRAND_OPTIONS))[
      "theme.css"
    ]!;
    expect(block(css, '  :root[data-theme="dark"] [data-brand="acme"]')).toEqual([
      "--u-color-action: var(--u-palette-brand-300);",
    ]);
  });

  it("gives its own component its prefix, and the base's components only what it changes", async () => {
    const files = await run({ ...BRAND, "test.resolver.json": BRAND_RESOLVER }, BRAND_OPTIONS);
    expect(block(files["acme-card.tokens.css"]!, ":host")).toEqual([
      "--acme-card-background: var(--u-color-action);",
    ]);
    expect(block(files["acme-button.tokens.css"]!, ":host")).toEqual([
      "--u-button-duration: var(--u-motion-duration-fast);",
    ]);
    expect(files["acme-button.tokens.css"]).not.toContain("variant");
  });
});

describe("the three-level rule", () => {
  const broken = (patch: Record<string, unknown>, options?: TokensCssOptions) =>
    run({ ...BASE, "test.resolver.json": BASE_RESOLVER, ...patch }, options);

  it.each([
    [
      "a primitive is an alias",
      {
        "base/primitive.tokens.json": {
          ...BASE["base/primitive.tokens.json"],
          alias: { $type: "duration", $value: "{duration.0}" },
        },
      },
      "a primitive holds a value, not an alias",
    ],
    [
      "a semantic token holds a value",
      {
        "base/semantic.tokens.json": {
          motion: { duration: { fast: { $type: "duration", $value: { value: 1, unit: "ms" } } } },
        },
      },
      "motion.duration.fast",
    ],
    [
      "a component token aliases a primitive",
      {
        "base/button.tokens.json": {
          button: {
            ...BASE["base/button.tokens.json"].button,
            background: { $value: "{palette.brand.600}", $description: "Background." },
          },
        },
      },
      "a component token aliases a semantic token, not a primitive",
    ],
    [
      "a component token has no description",
      {
        "base/button.tokens.json": {
          button: {
            ...BASE["base/button.tokens.json"].button,
            duration: { $value: "{motion.duration.fast}" },
          },
        },
      },
      "button.duration: a component token needs a $description",
    ],
    [
      "the themes declare different tokens",
      { "base/dark.tokens.json": {} },
      `Themes "light" and "dark" don't declare the same tokens`,
    ],
  ])("fails the build when %s", async (_, patch, message) => {
    await expect(broken(patch)).rejects.toThrow(message);
  });

  it("fails the build for a component group or a context without a selector", async () => {
    await expect(broken({}, { ...BASE_OPTIONS, components: {} })).rejects.toThrow(
      'no sheet for the component "button"',
    );
    await expect(
      broken({}, { ...BASE_OPTIONS, components: { button: { file: "button.tokens.css" } } }),
    ).rejects.toThrow('Context "button-variant: danger" has no selector');
  });
});
