// The tokens of a design system, from its token manifest (ADR 0042). Node.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDocs,
  extendDocs,
  filterTokens,
  findToken,
  formatSearchResults,
  formatToken,
  formatTokenList,
  normalizeValue,
  readTokenManifest,
  searchTokens,
  type CustomElementsManifest,
  type TokenManifest,
} from "./index.ts";
import { loadSocleDocs, withoutBaseClasses } from "./socle.ts";

/** A button that reads one component token. */
const components: CustomElementsManifest = {
  modules: [
    {
      declarations: [
        {
          kind: "class",
          name: "Button",
          tagName: "x-button",
          customElement: true,
          summary: "Triggers an action.",
          cssProperties: [{ name: "--x-button-background", description: "Background." }],
        },
      ],
    },
  ],
};

/** Two primitives, two semantic tokens, a component token with a variant. */
const tokens: TokenManifest = {
  schemaVersion: 1,
  modifiers: [
    { name: "theme", default: "light", contexts: ["light", "dark"] },
    { name: "button-variant", default: "primary", contexts: ["primary", "danger"] },
  ],
  tokens: [
    {
      id: "palette.brand.300",
      name: "--x-palette-brand-300",
      level: "primitive",
      type: "color",
      group: "palette.brand",
      value: "#9cc6ff",
      aliasChain: [],
    },
    {
      id: "palette.brand.600",
      name: "--x-palette-brand-600",
      level: "primitive",
      type: "color",
      group: "palette.brand",
      description: "Actions (primary).",
      value: "#1c65c8",
      aliasChain: [],
    },
    {
      id: "color.action",
      name: "--x-color-action",
      level: "semantic",
      type: "color",
      group: "color",
      description: "Primary actions, like `x-button`.",
      value: "#1c65c8",
      aliasChain: ["palette.brand.600"],
      contexts: { "theme:dark": { value: "#9cc6ff", aliasChain: ["palette.brand.300"] } },
    },
    {
      id: "spacing.md",
      name: "--x-spacing-md",
      level: "semantic",
      type: "dimension",
      group: "spacing",
      description: "The padding of a region.",
      value: "1rem",
      aliasChain: [],
    },
    {
      id: "button.background",
      name: "--x-button-background",
      level: "component",
      type: "color",
      group: "button",
      description: "Background (ADR 0008). Its look is that of `ButtonBase`.",
      value: "#1c65c8",
      aliasChain: ["color.action", "palette.brand.600"],
      contexts: {
        "theme:dark": { value: "#9cc6ff", aliasChain: ["color.action", "palette.brand.300"] },
        "button-variant:danger": { value: "#b6322d", aliasChain: [] },
      },
    },
  ],
};

const base = createDocs({
  name: "X",
  prefix: "x",
  package: "@x/components",
  manifest: components,
  tokens,
  internal: [/\s*\(ADR \d{4}\)/g, withoutBaseClasses],
});

const ids = (list: readonly { id: string }[]) => list.map(({ id }) => id);

describe("the tokens of a design system", () => {
  it("reads them from the manifest, with their contexts and modifiers", () => {
    expect(ids(base.tokens)).toEqual(ids(tokens.tokens));
    expect(findToken(base, "palette.brand.300")!.contexts).toEqual({});
    expect(base.tokenModifiers.map(({ name }) => name)).toEqual(["theme", "button-variant"]);
  });

  it("finds a token by its ID or its custom property, in any form", () => {
    for (const query of [
      "color.action",
      "--x-color-action",
      "x-color-action",
      "var(--x-color-action)",
      " var(--x-color-action, red) ",
    ]) {
      expect(findToken(base, query)?.id, query).toBe("color.action");
    }
    expect(findToken(base, "color.nothing")).toBeUndefined();
  });

  it("filters by level, by group (a segment of the ID) and by type", () => {
    expect(ids(filterTokens(base, { level: "semantic" }))).toEqual(["color.action", "spacing.md"]);
    expect(ids(filterTokens(base, { group: "palette" }))).toEqual([
      "palette.brand.300",
      "palette.brand.600",
    ]);
    expect(filterTokens(base, { group: "pal" })).toEqual([]);
    expect(ids(filterTokens(base, { type: "dimension" }))).toEqual(["spacing.md"]);
  });

  it("refuses a manifest of another version", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "tokens-")), "token-manifest.json");
    await writeFile(file, JSON.stringify({ ...tokens, schemaVersion: 2 }));
    await expect(readTokenManifest(file)).rejects.toThrow("this catalog reads version 1");
  });
});

describe("searchTokens()", () => {
  it("finds the tokens of a value, semantic tokens first, in any context", () => {
    expect(ids(searchTokens(base, "#1C65C8").map(({ token }) => token))).toEqual([
      "color.action",
      "palette.brand.600",
      "button.background",
    ]);
    const dark = searchTokens(base, "#9CC6FF");
    expect(dark[0]!.token.id).toBe("color.action");
    expect(dark[0]!.matches).toEqual(["value theme:dark"]);
    expect(searchTokens(base, "16px")[0]!.token.id).toBe("spacing.md");
  });

  it("finds the tokens whose name or description hold every word", () => {
    expect(ids(searchTokens(base, "primary").map(({ token }) => token))).toEqual([
      "color.action",
      "palette.brand.600",
    ]);
    expect(searchTokens(base, "action background").map(({ token }) => token.id)).toEqual([]);
    expect(searchTokens(base, "brand 300")[0]!.token.id).toBe("palette.brand.300");
  });

  it("compares values in one form", () => {
    expect(normalizeValue("#ABC")).toBe("#aabbcc");
    expect(normalizeValue("#1c65c8ff")).toBe("#1c65c8");
    expect(normalizeValue("1rem")).toBe("16px");
    expect(normalizeValue("0.15s")).toBe("150ms");
  });
});

describe("the Markdown of the tokens", () => {
  it("lists the semantic tokens by default, with their dark values", () => {
    const list = formatTokenList(base);
    expect(list).toContain("2 semantic tokens");
    expect(list).toContain("- `--x-color-action` `#1c65c8` · theme:dark `#9cc6ff` — Primary");
    expect(list).not.toContain("--x-palette-brand-600");
    expect(formatTokenList(base, { group: "button" })).toContain("(+1 contexts)");
    expect(formatTokenList(base, { group: "nothing" })).toContain("No token matches.");
  });

  it("sends a primitive to the semantic tokens that alias it", () => {
    const page = formatToken(base, findToken(base, "palette.brand.600")!);
    expect(page).toContain("prefer the semantic token of the intent");
    expect(page).toContain("- `--x-color-action` — Primary actions");
  });

  it("gives each value of a component token, its aliases and its components", () => {
    const page = formatToken(base, findToken(base, "button.background")!);
    expect(page).toContain("Read by `<x-button>`.");
    expect(page).toContain("- default: `#1c65c8` ← `--x-color-action` ← `--x-palette-brand-600`");
    expect(page).toContain("- button-variant:danger: `#b6322d`");
  });

  it("puts the tokens after the components in a search", () => {
    const text = formatSearchResults("action", [], searchTokens(base, "action"));
    expect(text).toContain("- `--x-color-action`");
    expect(formatSearchResults("nothing", [], [])).toBe('Nothing matches "nothing".');
  });
});

describe("the tokens of a design system built on another", () => {
  const layer = { name: "ACME", prefix: "acme", package: "@acme/design-system" };

  it("keeps the base's tokens without a manifest, in its own words", () => {
    const acme = extendDocs(base, layer);
    expect(ids(acme.tokens)).toEqual(ids(base.tokens));
    expect(findToken(acme, "color.action")!.description).toBe(
      "Primary actions, like `acme-button`.",
    );
    expect(findToken(acme, "button.background")!.description).toBe("Background.");
  });

  it("takes its own manifest, and renames the base's words in it", () => {
    const acme = extendDocs(base, {
      ...layer,
      tokens: {
        ...tokens,
        tokens: tokens.tokens.map((token) =>
          token.id === "palette.brand.600" ? { ...token, value: "#801acc" } : token,
        ),
      },
    });
    expect(findToken(acme, "palette.brand.600")!.value).toBe("#801acc");
    expect(findToken(acme, "button.background")!.description).toBe("Background.");
  });
});

describe("the tokens of the base", async () => {
  const socle = await loadSocleDocs();

  it("are every token of @unicorne/tokens, each semantic token described", () => {
    expect(socle.tokens.length).toBeGreaterThan(600);
    const semantic = filterTokens(socle, { level: "semantic" });
    expect(semantic.filter(({ description }) => !description).map(({ id }) => id)).toEqual([]);
    expect(findToken(socle, "color.action.background")!.contexts["theme:dark"]).toBeDefined();
  });

  it("leave nothing of the base in a design system's view, but the custom properties", () => {
    const acme = extendDocs(socle, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
    });
    const text = [
      ...acme.tokens.map((token) => formatToken(acme, token)),
      ...(["primitive", "semantic", "component"] as const).map((level) =>
        formatTokenList(acme, { level }),
      ),
    ].join("\n");
    const leaks = text
      .replace(/--u-[\w-]+/g, "")
      .match(/unicorne|socle|\bADR\b|<u-[a-z]|`u-[a-z]|`\w+(?:Base|Controller)`|the base/gi);
    expect(leaks).toBeNull();
  });
});
