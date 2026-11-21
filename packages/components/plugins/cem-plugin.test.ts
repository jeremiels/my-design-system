import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { componentCssProperties, tokensManifest } from "./cem-plugin.ts";
import type { Declaration, ResolverSources } from "@unicorne/tokens/dtcg-sources";

const declaration = (
  id: string,
  value: unknown,
  description?: string,
  file = "base/button.tokens.json",
): Declaration => ({ id, file, value, description });

/** A semantic token, a button with a variant, and a brand that changes one default. */
const sources: ResolverSources = {
  file: "test.resolver.json",
  sets: new Map([
    ["semantic", [declaration("color.action", "{palette.brand.600}")]],
    [
      "component",
      [
        declaration("button.background-color", "{color.action}", "Background color."),
        declaration("button.border-radius", "{radius.md}", "Corner radius."),
        declaration("card.padding", "{spacing.lg}", "Padding."),
        // A brand's file, after the base's: a new default, the same description.
        declaration("button.border-radius", "{radius.full}", undefined, "brand/button.tokens.json"),
      ],
    ],
  ]),
  modifiers: new Map([
    [
      "button-variant",
      {
        default: "primary",
        contexts: new Map([
          ["primary", []],
          ["danger", [declaration("button.background-color", "{color.danger}")]],
        ]),
      },
    ],
  ]),
};

describe("componentCssProperties", () => {
  it("documents a group's tokens with their default and description", () => {
    expect(componentCssProperties(sources, "button", {})).toEqual([
      {
        description: "Background color.",
        name: "--u-button-background-color",
        default: "var(--u-color-action)",
      },
      {
        description: "Corner radius.",
        name: "--u-button-border-radius",
        default: "var(--u-radius-full)",
      },
    ]);
  });

  it("names a brand component's tokens with its prefix, and the semantic tokens with the base's", () => {
    expect(
      componentCssProperties(sources, "card", { components: { card: { prefix: "acme" } } }),
    ).toEqual([
      { description: "Padding.", name: "--acme-card-padding", default: "var(--u-spacing-lg)" },
    ]);
  });

  it("documents only the tokens of the emitted files: a brand's subclass inherits the others", () => {
    const emit = (file: string) => file.startsWith("brand/");
    expect(componentCssProperties(sources, "button", { emit })).toEqual([
      {
        description: "Corner radius.",
        name: "--u-button-border-radius",
        default: "var(--u-radius-full)",
      },
    ]);
  });
});

describe("tokensManifest", () => {
  // The analyzer's TypeScript calls, for a class with a JSDoc `@tokens` tag.
  const ts = (tag: string) => ({
    isClassDeclaration: () => true,
    getJSDocTags: () => [{ tagName: { text: "tokens" }, comment: tag }],
  });
  const plugin = tokensManifest({
    resolver: createRequire(import.meta.url).resolve("@unicorne/tokens/resolver.json"),
  });

  it("fills the cssProperties of the class that names its group", () => {
    const moduleDoc = { path: "alert.ts", declarations: [{ name: "Alert" }] as { name: string }[] };
    plugin.analyzePhase({
      ts: ts("alert - Its tokens."),
      node: { name: { text: "Alert" } },
      moduleDoc,
    });
    expect(moduleDoc.declarations[0]).toMatchObject({
      cssProperties: expect.arrayContaining([
        {
          description: "Background color (variants change the default).",
          name: "--u-alert-background-color",
          default: "var(--u-color-information-background)",
        },
      ]),
    });
  });

  it("documents the tokens of each group a class names", () => {
    const moduleDoc = {
      path: "select.ts",
      declarations: [{ name: "Select" }] as { name: string }[],
    };
    plugin.analyzePhase({
      ts: {
        isClassDeclaration: () => true,
        getJSDocTags: () => [
          { tagName: { text: "tokens" }, comment: "select - Its tokens." },
          { tagName: { text: "tokens" }, comment: "listbox - Its list's tokens." },
        ],
      },
      node: { name: { text: "Select" } },
      moduleDoc,
    });
    const names = (
      moduleDoc.declarations[0] as { cssProperties?: { name: string }[] }
    ).cssProperties!.map(({ name }) => name);
    expect(names).toContain("--u-select-selected-font-weight");
    expect(names.some((name) => name.startsWith("--u-listbox-"))).toBe(true);
  });

  it("fails for a group without component tokens", () => {
    const moduleDoc = { path: "x.ts", declarations: [{ name: "X" }] };
    expect(() =>
      plugin.analyzePhase({ ts: ts("color"), node: { name: { text: "X" } }, moduleDoc }),
    ).toThrow("@tokens color — no component token in this group");
  });
});
