// The usage of the tokens, from their DSDS entries: rules, pairs, and
// `token-pair` (ADR 0046). Node, on the base's documentation.
import { contrastPairs } from "@unicorne/tokens/testing";
import { describe, expect, it } from "vitest";
import {
  checkCss,
  defaultCssRules,
  defaultRules,
  extendDocs,
  findToken,
  formatToken,
  formatTokenList,
  type TokenManifest,
} from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

const socle = await loadSocleDocs();

/** `var(--u-color-action-text)` → `color.action.text`. */
const idOf = (css: string) => findToken(socle, css)!.id;

describe("the usage of the tokens", () => {
  it("gives a token the usage, the rules and the pairs of its DSDS entry", () => {
    const text = findToken(socle, "color.action.text")!;
    expect(text.usage).toContain(
      "Le texte et les icônes posés sur le fond d'une action principale",
    );
    expect(text.combos).toEqual([
      {
        level: "must",
        items: [
          "color.action.background",
          "color.action.background-hover",
          "color.action.background-active",
        ],
        note: "Le contraste de 4,5:1 est mesuré sur ces fonds, dans les deux thèmes.",
      },
    ]);
    expect(findToken(socle, "color.border.control")!.guidelines![0]!.statement).toContain(
      "pas avec `color.border.default`",
    );
    expect(formatToken(socle, text)).toContain(
      "## Pairs\n\n- **MUST** be paired with `--u-color-action-background`,",
    );
  });

  it("documents as a pair each pair whose contrast the tokens' test measures, and only those", () => {
    const measured = new Set(
      contrastPairs.map(({ foreground, background }) => `${idOf(foreground)} ${idOf(background)}`),
    );
    // The pairs of colors: other tokens pair too, a duration with its curve.
    const documented = new Set(
      socle.tokens
        .filter(({ id }) => id.startsWith("color."))
        .flatMap(({ id, combos = [] }) =>
          combos
            .filter(({ level }) => level === "must" || level === "should")
            .flatMap(({ items }) => items.map((item) => `${id} ${item}`)),
        ),
    );
    expect([...measured].filter((pair) => !documented.has(pair))).toEqual([]);
    expect([...documented].filter((pair) => !measured.has(pair))).toEqual([]);
  });

  it("keeps the base's usage in a design system's tokens, in its words, and adds its own", () => {
    const acme = extendDocs(socle, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
      tokenUsage: new Map([
        [
          "color.action.text",
          {
            guidelines: [
              {
                level: "should",
                statement: "Écrivez en capitales le texte d'un bouton d'ACME.",
                framing: "how-to-use",
                audience: "all",
                scope: "users",
                alternatives: [],
              },
            ],
            combos: [],
          },
        ],
      ]),
    });
    const text = findToken(acme, "color.action.text")!;
    expect(text.combos).toEqual(findToken(socle, "color.action.text")!.combos);
    expect(text.guidelines!.map(({ statement }) => statement)).toEqual([
      "Écrivez en capitales le texte d'un bouton d'ACME.",
    ]);
  });
});

describe("token-pair", () => {
  const problems = (css: string) =>
    checkCss(socle, css)
      .filter(({ rule }) => rule === "token-pair")
      .map(({ severity, message }) => `${severity}: ${message}`);

  it("fails on a color on a background its pairs don't allow, in one block", () => {
    expect(
      problems(
        ".a { color: var(--u-color-action-text); background: var(--u-color-surface-default); }",
      ),
    ).toEqual([
      "error: `--u-color-action-text` on `--u-color-surface-default`: it MUST be paired with `--u-color-action-background`, `--u-color-action-background-hover`, `--u-color-action-background-active`. Le contraste de 4,5:1 est mesuré sur ces fonds, dans les deux thèmes.",
    ]);
  });

  it("leaves a pair it allows, a color without a background, and a background it can't read", () => {
    expect(
      problems(`
.a { color: var(--u-color-action-text); background-color: var(--u-color-action-background-hover); }
.b { color: var(--u-color-text-default); }
.c { color: var(--u-color-text-default); background: var(--app-background); }
.d { border-color: var(--u-color-border-control); background: var(--u-color-surface-raised); }`),
    ).toEqual([]);
  });
});

describe("the usage of a group of tokens (ADR 0050)", () => {
  it("gives the rules of a group to each of its tokens, before their own", () => {
    expect(socle.tokenGroups.map(({ name }) => name)).toEqual([
      "spacing",
      "font",
      "text",
      "motion",
    ]);
    const md = findToken(socle, "spacing.md")!;
    expect(md.guidelines![0]!.statement).toContain(
      "avec un token `spacing`, jamais une longueur brute",
    );
    expect(findToken(socle, "font.size.lg")!.combos![0]!.items).toEqual(["font.weight.semibold"]);
    expect(findToken(socle, "color.action.text")!.guidelines ?? []).toEqual([]);
  });

  it("names only tokens that exist, and checks that exist", () => {
    // The rules of check: on CSS, on markup, and the names of the design system.
    const cssRules = new Set([
      ...[...defaultCssRules, ...defaultRules].map(({ id }) => id),
      "unknown-element",
      "unknown-text-style",
    ]);
    for (const { guidelines } of socle.tokenGroups) {
      for (const { statement, check } of guidelines) {
        const named = [...statement.matchAll(/`([a-z0-9-]+(?:\.[a-z0-9-]+)+)`/g)].map(
          ([, id]) => id!,
        );
        // A file, like `reset.css`, isn't a token.
        expect(
          named.filter((id) => !/\.(css|js|ts|json)$/.test(id) && !findToken(socle, id)),
        ).toEqual([]);
        if (check) {
          expect(cssRules).toContain(check.rule);
        }
      }
    }
  });

  it("lists the rules of a group with its tokens, and says which groups have rules", () => {
    expect(formatTokenList(socle, { group: "font.size" })).toContain("## Rules of `font`");
    expect(formatTokenList(socle, { group: "motion" })).toContain(
      "N'écrivez pas de durée brute : elle ignore `prefers-reduced-motion`.",
    );
    expect(formatTokenList(socle)).toContain(
      "Usage rules of `spacing`, `font`, `text`, `motion`: list the group.",
    );
    expect(formatTokenList(socle, { group: "spacing" })).toContain("_Partly checked by `check`._");
  });

  it("gives the base's rules to a token a design system adds to a group", () => {
    const tokens: TokenManifest = {
      schemaVersion: 1,
      modifiers: [],
      tokens: [
        {
          id: "spacing.3xl",
          name: "--acme-spacing-3xl",
          level: "semantic",
          type: "dimension",
          group: "spacing",
          description: "The space around the hero of a page.",
          value: "4rem",
          aliasChain: [],
          contexts: {},
        },
      ],
    };
    const acme = extendDocs(socle, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
      tokens,
    });
    expect(findToken(acme, "spacing.3xl")!.guidelines!.map(({ statement }) => statement)).toEqual(
      socle.tokenGroups[0]!.guidelines.map(({ statement }) => statement),
    );
    expect(acme.tokenGroups.map(({ name }) => name)).toEqual(["spacing", "font", "text", "motion"]);
  });
});
