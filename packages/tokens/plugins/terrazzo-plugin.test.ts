import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build, defineConfig, parse, type Plugin } from "@terrazzo/parser";
import { afterEach, describe, expect, it } from "vitest";
import {
  brandResolver,
  tokenManifest,
  tokensCss,
  type TokenManifest,
  type TokenManifestEntry,
  type TokensCssOptions,
} from "./terrazzo-plugin.ts";

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
    motion: { duration: { fast: { $value: "{duration.150}", $description: "A small change." } } },
  },
  "base/light.tokens.json": {
    color: { action: { $value: "{palette.brand.600}", $description: "Primary actions." } },
  },
  "base/dark.tokens.json": { color: { action: { $value: "{palette.brand.300}" } } },
  "base/reduced.tokens.json": { motion: { duration: { fast: { $value: "{duration.0}" } } } },
  "base/button.tokens.json": {
    button: {
      background: { $value: "{color.action}", $description: "Background." },
      duration: { $value: "{motion.duration.fast}", $description: "Transition." },
    },
  },
  "base/button.danger.tokens.json": { button: { background: { $value: "{color.danger}" } } },
  "base/danger.tokens.json": {
    color: { danger: { $value: "{palette.danger.600}", $description: "Destructive actions." } },
  },
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
function run(
  files: Record<string, unknown>,
  options: TokensCssOptions = BASE_OPTIONS,
): Promise<Record<string, string>> {
  return runPlugins(files, [tokensCss(options)]);
}

/** Runs Terrazzo with these plugins on these files: the output files, by name. */
async function runPlugins(
  files: Record<string, unknown>,
  plugins: Plugin[],
): Promise<Record<string, string>> {
  const directory = mkdtempSync(join(tmpdir(), "tokens-css-"));
  directories.push(directory);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, name)), { recursive: true });
    writeFileSync(join(directory, name), JSON.stringify(content));
  }
  const resolver = join(directory, "test.resolver.json");
  const config = defineConfig(
    { tokens: ["./test.resolver.json"], outDir: "./out/", plugins },
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
  it("puts primitives and semantic tokens on :root and [data-brand], in the layer", async () => {
    const { "tokens.css": css } = await run({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    expect(css).toMatch(/^\/\* Generated from .*\*\/\n@layer u\.tokens\.base \{\n/);
    // A brand container starts again from the base's primitives (ADR 0013).
    expect(block(css!, "  :root,\n  [data-brand]")).toEqual([
      "--u-palette-brand-300: #9cc6ff;",
      "--u-palette-brand-600: #1c65c8;",
      "--u-palette-danger-600: #b6322d;",
      "--u-duration-0: 0ms;",
      "--u-duration-150: 150ms;",
    ]);
    const afterPrimitives = css!.slice(css!.indexOf("--u-duration-150"));
    expect(block(afterPrimitives, "  :root,\n  [data-brand]")).toEqual([
      "--u-motion-duration-fast: var(--u-duration-150);",
      "--u-color-action: var(--u-palette-brand-600);",
      "--u-color-danger: var(--u-palette-danger-600);",
    ]);
  });

  it("gives each theme its zones, the system's preference the page, and reduced motion its media query", async () => {
    const { "tokens.css": css } = await run({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    const light = [
      "--u-color-action: var(--u-palette-brand-600);",
      "--u-color-danger: var(--u-palette-danger-600);",
    ];
    const dark = [
      "--u-color-action: var(--u-palette-brand-300);",
      "--u-color-danger: var(--u-palette-danger-600);",
    ];
    // Any element with data-theme, and the brand containers that follow it:
    // not those with their own theme, nor those in a zone of the other theme.
    expect(
      block(
        css!,
        '  [data-theme="light"],\n  [data-theme="light"] [data-brand]:not([data-theme]):not([data-theme="light"] [data-theme="dark"] *)',
      ),
    ).toEqual(light);
    expect(
      block(
        css!,
        '  [data-theme="dark"],\n  [data-theme="dark"] [data-brand]:not([data-theme]):not([data-theme="dark"] [data-theme="light"] *)',
      ),
    ).toEqual(dark);
    expect(css).toContain("  @media (prefers-color-scheme: dark) {\n");
    expect(
      block(
        css!,
        '    :root:not([data-theme="light"]),\n    :root:not([data-theme="light"]) [data-brand]:not([data-theme]):not([data-theme="light"] *)',
      ),
    ).toEqual(dark);
    expect(css).toContain(
      "  @media (prefers-reduced-motion: reduce) {\n    :root,\n    [data-brand] {",
    );
    expect(block(css!, "    :root,\n    [data-brand]")).toEqual([
      "--u-motion-duration-fast: var(--u-duration-0);",
    ]);
  });

  it("writes the light zone before the dark ones: a zone's own theme wins by order", async () => {
    const { "tokens.css": css } = await run({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    const at = (text: string) => css!.indexOf(text);
    expect(at('  [data-theme="light"],')).toBeGreaterThan(at("--u-motion-duration-fast"));
    expect(at("@media (prefers-color-scheme: dark)")).toBeGreaterThan(
      at('  [data-theme="light"],'),
    );
    expect(at('  [data-theme="dark"],')).toBeGreaterThan(at("@media (prefers-color-scheme: dark)"));
  });

  it("gives color-scheme the triggers of the themes", async () => {
    const { "tokens.css": css } = await run({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    expect(css).toContain("  :root {\n    color-scheme: light dark;\n  }");
    expect(block(css!, '  [data-theme="light"]')).toEqual(["color-scheme: light;"]);
    expect(block(css!, '  [data-theme="dark"]')).toEqual(["color-scheme: dark;"]);
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
    brand: "acme",
    page: "theme.css",
    components: {
      button: { file: "acme-button.tokens.css", attributes: { "button-variant": "variant" } },
      card: { file: "acme-card.tokens.css", prefix: "acme" },
    },
    emit: (file) => file.includes("/brand/"),
  };

  it("outputs only the brand's tokens, on its containers", async () => {
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
    const dark = ["--u-color-action: var(--u-palette-brand-300);"];
    // The brand's container with a theme, the container in a zone, and a zone
    // in the container.
    expect(
      block(
        css,
        [
          '  [data-brand="acme"][data-theme="dark"]',
          '  [data-theme="dark"] [data-brand="acme"]:not([data-theme]):not([data-theme="dark"] [data-theme="light"] *)',
          '  [data-brand="acme"] [data-theme="dark"]:not([data-brand], [data-brand="acme"] [data-brand] *)',
        ].join(",\n"),
      ),
    ).toEqual(dark);
    // The page of the brand, when it follows the system's preference.
    expect(
      block(
        css,
        [
          '    [data-brand="acme"]:root:not([data-theme="light"])',
          '    :root:not([data-theme="light"]) [data-brand="acme"]:not([data-theme]):not([data-theme="light"] *)',
        ].join(",\n"),
      ),
    ).toEqual(dark);
  });

  it("outputs the tokens of every file outside the base's package, without emit", async () => {
    const { emit: _emit, ...options } = BRAND_OPTIONS;
    // The files of this test are outside @unicorne/tokens: all of them are the brand's.
    const css = (await run({ ...BRAND, "test.resolver.json": BRAND_RESOLVER }, options))[
      "theme.css"
    ]!;
    expect(css).toContain("--u-palette-danger-600");
  });

  it("refuses a brand name that can't be an attribute value", async () => {
    await expect(
      run({ ...BRAND, "test.resolver.json": BRAND_RESOLVER }, { ...BRAND_OPTIONS, brand: "Acme!" }),
    ).rejects.toThrow("name the brand in lowercase");
  });

  it("leaves color-scheme to the base, whose themes it keeps", async () => {
    const css = (await run({ ...BRAND, "test.resolver.json": BRAND_RESOLVER }, BRAND_OPTIONS))[
      "theme.css"
    ]!;
    expect(css).not.toMatch(/^\s*color-scheme:/m);
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
      "a component token aliases a token of another component",
      {
        "base/button.tokens.json": {
          button: {
            ...BASE["base/button.tokens.json"].button,
            border: { $value: "{alert.background}", $description: "Border." },
          },
          alert: { background: { $value: "{color.action}", $description: "Background." } },
        },
      },
      "not one of another component",
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
      "a semantic token has no description",
      { "base/light.tokens.json": { color: { action: { $value: "{palette.brand.600}" } } } },
      "color.action: a semantic token needs a $description",
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

describe("a brand's resolver (ADR 0013)", () => {
  function brandDirectory(files: Record<string, unknown>): string {
    const directory = mkdtempSync(join(tmpdir(), "brand-resolver-"));
    directories.push(directory);
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(dirname(join(directory, name)), { recursive: true });
      writeFileSync(join(directory, name), JSON.stringify(content));
    }
    return directory;
  }
  const read = (file: string) =>
    JSON.parse(readFileSync(file, "utf8")) as {
      sets: Record<string, { sources: { $ref: string }[] }>;
      modifiers: Record<string, { default: string; contexts: Record<string, { $ref: string }[]> }>;
      resolutionOrder: { $ref: string }[];
    };
  const refs = (sources: { $ref: string }[]) => sources.map(({ $ref }) => $ref);

  it("puts the brand's files after the base's, in the base's sets and contexts", () => {
    const directory = brandDirectory({
      "primitive/palette.tokens.json": {},
      "semantic/semantic.tokens.json": {},
      "semantic/theme.dark.tokens.json": {},
      "component/button/button.tokens.json": {},
      "component/button/variant.danger.tokens.json": {},
    });
    const file = brandResolver({ name: "acme", sources: directory });
    expect(file).toBe(join(directory, ".acme.resolver.json"));
    const { sets, modifiers } = read(file);

    const primitive = refs(sets.primitive!.sources);
    expect(primitive.at(-1)).toBe("primitive/palette.tokens.json");
    // The base's files, without the brand listing them.
    expect(
      primitive.filter((ref) => ref.endsWith("src/primitive/palette.tokens.json")),
    ).toHaveLength(1);
    expect(primitive.length).toBeGreaterThan(2);
    expect(refs(sets.semantic!.sources).at(-1)).toBe("semantic/semantic.tokens.json");
    expect(refs(sets.component!.sources).at(-1)).toBe("component/button/button.tokens.json");
    expect(refs(modifiers.theme!.contexts.dark!).at(-1)).toBe("semantic/theme.dark.tokens.json");
    expect(refs(modifiers["button-variant"]!.contexts.danger!).at(-1)).toBe(
      "component/button/variant.danger.tokens.json",
    );
  });

  it("adds the modifiers of the brand's own components", () => {
    const directory = brandDirectory({
      "component/card/card.tokens.json": {},
      "component/card/size.small.tokens.json": {},
    });
    const { modifiers, resolutionOrder } = read(
      brandResolver({
        name: "acme",
        sources: directory,
        modifiers: { "card-size": { default: "medium" } },
      }),
    );
    expect(modifiers["card-size"]).toEqual({
      default: "medium",
      contexts: { medium: [], small: [{ $ref: "component/card/size.small.tokens.json" }] },
    });
    expect(resolutionOrder.at(-1)).toEqual({ $ref: "#/modifiers/card-size" });
  });

  it("fails for a context file of an unknown modifier", () => {
    const directory = brandDirectory({ "component/card/size.small.tokens.json": {} });
    expect(() => brandResolver({ name: "acme", sources: directory })).toThrow(
      'no modifier "card-size"',
    );
  });
});

describe("the token manifest (ADR 0042)", () => {
  /** The manifest of these files, and its tokens by ID. */
  async function manifestOf(files: Record<string, unknown>, prefixes = {}) {
    const output = await runPlugins(files, [
      tokenManifest({ file: "token-manifest.json", components: prefixes }),
    ]);
    const manifest = JSON.parse(output["token-manifest.json"]!) as TokenManifest;
    const tokens: Record<string, TokenManifestEntry> = Object.fromEntries(
      manifest.tokens.map((token) => [token.id, token]),
    );
    return { manifest, tokens };
  }

  it("gives each token its custom property, level, type, value and aliases", async () => {
    const { manifest, tokens } = await manifestOf({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.tokens.map(({ id }) => id).slice(0, 3)).toEqual([
      "palette.brand.300",
      "palette.brand.600",
      "palette.danger.600",
    ]);
    expect(tokens["palette.brand.600"]).toEqual({
      id: "palette.brand.600",
      name: "--u-palette-brand-600",
      level: "primitive",
      type: "color",
      group: "palette.brand",
      value: "#1c65c8",
      aliasChain: [],
    });
    expect(tokens["color.action"]).toMatchObject({
      level: "semantic",
      description: "Primary actions.",
      value: "#1c65c8",
      aliasChain: ["palette.brand.600"],
    });
    expect(tokens["button.duration"]).toMatchObject({
      level: "component",
      type: "duration",
      value: "150ms",
      aliasChain: ["motion.duration.fast", "duration.150"],
    });
  });

  it("gives the value of each context that changes a token, through its aliases", async () => {
    const { manifest, tokens } = await manifestOf({ ...BASE, "test.resolver.json": BASE_RESOLVER });
    expect(tokens["color.action"]!.contexts).toEqual({
      "theme:dark": { value: "#9cc6ff", aliasChain: ["palette.brand.300"] },
    });
    // The button reads color.action: the dark theme changes it too.
    expect(tokens["button.background"]!.contexts).toEqual({
      "theme:dark": { value: "#9cc6ff", aliasChain: ["color.action", "palette.brand.300"] },
      "button-variant:danger": {
        value: "#b6322d",
        aliasChain: ["color.danger", "palette.danger.600"],
      },
    });
    expect(tokens["motion.duration.fast"]!.contexts).toEqual({
      "motion:reduced": { value: "0ms", aliasChain: ["duration.0"] },
    });
    expect(tokens["palette.brand.600"]!.contexts).toBeUndefined();
    expect(manifest.modifiers).toEqual([
      { name: "theme", default: "light", contexts: ["light", "dark"] },
      { name: "motion", default: "full", contexts: ["full", "reduced"] },
      { name: "button-variant", default: "primary", contexts: ["primary", "danger"] },
    ]);
  });

  it("gives a brand's values, and keeps the base's descriptions it doesn't change", async () => {
    const files = {
      ...BASE,
      "base/primitive.tokens.json": {
        palette: {
          $description: "Raw colors.",
          ...BASE["base/primitive.tokens.json"].palette,
        },
        duration: BASE["base/primitive.tokens.json"].duration,
      },
      "brand/primitive.tokens.json": {
        palette: { $description: "ACME purple.", brand: { 600: color("#801acc") } },
      },
      "brand/button.tokens.json": { button: { duration: { $value: "{motion.duration.fast}" } } },
      "brand/card.tokens.json": {
        card: { background: { $value: "{color.action}", $description: "Background." } },
      },
      "test.resolver.json": resolverFor({
        primitive: ["base/primitive.tokens.json", "brand/primitive.tokens.json"],
        semantic: ["base/semantic.tokens.json"],
        component: [
          "base/button.tokens.json",
          "brand/button.tokens.json",
          "brand/card.tokens.json",
        ],
        light: ["base/light.tokens.json", "base/danger.tokens.json"],
        dark: ["base/dark.tokens.json", "base/danger.tokens.json"],
        reduced: ["base/reduced.tokens.json"],
        danger: ["base/button.danger.tokens.json"],
      }),
    };
    const { tokens } = await manifestOf(files, { card: { prefix: "acme" } });
    expect(tokens["palette.brand.600"]).toMatchObject({
      value: "#801acc",
      description: "ACME purple.",
    });
    // A group description belongs to its file: the brand's palette doesn't
    // describe the base's danger colors.
    expect(tokens["palette.danger.600"]!.description).toBe("Raw colors.");
    expect(tokens["color.action"]!.value).toBe("#801acc");
    expect(tokens["button.duration"]!.description).toBe("Transition.");
    expect(tokens["card.background"]).toMatchObject({
      name: "--acme-card-background",
      value: "#801acc",
    });
  });

  it("fails the build when the tokens break a rule", async () => {
    await expect(
      manifestOf({
        ...BASE,
        "base/light.tokens.json": { color: { action: { $value: "{palette.brand.600}" } } },
        "test.resolver.json": BASE_RESOLVER,
      }),
    ).rejects.toThrow("color.action: a semantic token needs a $description");
  });
});

describe("the text styles (ADR 0051)", () => {
  const style = (parts: Record<string, string>) => ({
    text: { body: { $type: "typography", $description: "Body text.", $value: parts } },
  });
  const parts = {
    fontFamily: "{font-family.sans}",
    fontSize: "{font-size.200}",
    fontWeight: "{font-weight.400}",
    letterSpacing: "{letter-spacing.0}",
    lineHeight: "{line-height.150}",
  };
  const TEXT = {
    ...BASE,
    "base/primitive.tokens.json": {
      ...BASE["base/primitive.tokens.json"],
      "font-family": { $type: "fontFamily", sans: { $value: ["Helvetica Neue", "sans-serif"] } },
      "font-size": { $type: "dimension", 200: { $value: { value: 1, unit: "rem" } } },
      "font-weight": { $type: "fontWeight", 400: { $value: 400 } },
      "line-height": { $type: "number", 150: { $value: 1.5 } },
      "letter-spacing": { $type: "dimension", 0: { $value: { value: 0, unit: "rem" } } },
    },
    "base/semantic.tokens.json": { ...BASE["base/semantic.tokens.json"], ...style(parts) },
    "test.resolver.json": BASE_RESOLVER,
  };

  it("writes a text style as the font shorthand, and a class of it in u.utilities", async () => {
    const { "tokens.css": css } = await run(TEXT);
    expect(css).toContain(
      "--u-text-body: var(--u-font-weight-400) var(--u-font-size-200)/var(--u-line-height-150) var(--u-font-family-sans);",
    );
    expect(css).toContain(
      "@layer u.utilities {\n  .u-text-body {\n    font: var(--u-text-body);\n    letter-spacing: var(--u-letter-spacing-0);\n  }\n}",
    );
  });

  it("gives a brand's sheet a class of each text style under its prefix, the base's included", async () => {
    const { "theme.css": css } = await run(TEXT, {
      brand: "acme",
      layer: "u.tokens.brand",
      page: "theme.css",
      emit: () => false,
    });
    expect(css).toContain(".acme-text-body {\n    font: var(--u-text-body);");
    expect(css).not.toContain("--u-text-body:");
  });

  it.each([
    ["a part holds a value", { fontSize: { value: 1, unit: "rem" } }, "not a value (fontSize)"],
    [
      "a part aliases a component token",
      { fontSize: "{button.font-size}" },
      "component token (fontSize)",
    ],
  ])("fails the build when %s", async (_, patch, message) => {
    await expect(
      run({
        ...TEXT,
        "base/semantic.tokens.json": {
          ...BASE["base/semantic.tokens.json"],
          font: {
            size: { $type: "dimension", md: { $value: "{font-size.200}", $description: "Body." } },
          },
          ...style({ ...parts, ...patch } as Record<string, string>),
        },
        "base/button.tokens.json": {
          button: {
            ...BASE["base/button.tokens.json"].button,
            "font-size": {
              $type: "dimension",
              $value: "{font.size.md}",
              $description: "Its text.",
            },
          },
        },
      }),
    ).rejects.toThrow(message);
  });

  it("gives a text style its font shorthand, its parts and its class in the manifest", async () => {
    const output = await runPlugins(TEXT, [
      tokenManifest({ file: "token-manifest.json", classPrefix: "acme" }),
    ]);
    const manifest = JSON.parse(output["token-manifest.json"]!) as TokenManifest;
    expect(manifest.tokens.find(({ id }) => id === "text.body")).toMatchObject({
      type: "typography",
      value: '400 1rem/1.5 "Helvetica Neue", sans-serif',
      parts: {
        "font-family": "font-family.sans",
        "font-size": "font-size.200",
        "font-weight": "font-weight.400",
        "letter-spacing": "letter-spacing.0",
        "line-height": "line-height.150",
      },
      className: "acme-text-body",
    });
  });
});
