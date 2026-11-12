// The DSDS documents (design-system.dsds.yaml) carry usage guidelines and
// point at the facts other files own. dsds-validate checks their schema; this
// checks what it can't: that they match the components, and that their
// pointers lead somewhere.
import { describe, expect, it } from "vitest";
import { documents, guidelinesMarkdown, type Pointer } from "../.storybook/dsds.js";
import manifest from "../custom-elements.json";
import "./define.js";

interface Attribute {
  name: string;
  default?: string;
}
interface Declaration {
  tagName?: string;
  attributes?: Attribute[];
}

const declarations = (manifest.modules as { declarations?: Declaration[] }[]).flatMap(
  (module) => module.declarations ?? [],
);

/** Every file of the repository a document may point at, by path from the root. */
const files = new Set(
  Object.keys(
    import.meta.glob(["/src/**/*", "/tests/**/*", "/custom-elements.json", "!**/*.dsds.yaml"], {
      query: "?url",
    }),
  ),
);
const sources = import.meta.glob<string>("/src/**/*.stories.ts", {
  query: "?raw",
  import: "default",
});

/** The values the sheets style on the host, e.g. `variant` → `["danger", …]`. */
function styledValues(element: Element, attribute: string): string[] {
  const values = new Set<string>();
  const collect = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        for (const [, value] of rule.selectorText.matchAll(
          new RegExp(`:host\\(\\[${attribute}="([^"]*)"\\]\\)`, "g"),
        )) {
          values.add(value);
        }
      }
      if ("cssRules" in rule) {
        collect((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  for (const sheet of element.shadowRoot!.adoptedStyleSheets) {
    collect(sheet.cssRules);
  }
  return [...values];
}

describe.each(Object.entries(documents))("%s", (path, entry) => {
  const tag = `u-${entry.id}`;
  const declaration = declarations.find((candidate) => candidate.tagName === tag);

  it("documents a component of the catalog", () => {
    expect(customElements.get(tag)).toBeDefined();
    expect(declaration).toBeDefined();
  });

  it("has a documented attribute for every trait", () => {
    const attributes = declaration?.attributes?.map(({ name }) => name) ?? [];
    for (const trait of entry.traits ?? []) {
      expect(attributes).toContain(trait.id);
    }
  });

  it("lists exactly the default and styled values of every enum trait", async () => {
    const element = document.createElement(tag);
    document.body.append(element);
    await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    for (const trait of entry.traits?.filter(({ kind }) => kind === "enum") ?? []) {
      const fallback = declaration?.attributes?.find(({ name }) => name === trait.id)?.default;
      const expected = new Set([JSON.parse(fallback ?? '""'), ...styledValues(element, trait.id)]);
      expect(trait.values?.map(({ id }) => id).sort()).toEqual([...expected].sort());
    }
    element.remove();
  });

  it("points at files and stories that exist", async () => {
    const pointers: (Pointer | string)[] = [
      ...(entry.refs ?? []),
      ...(entry.specs ?? []),
      ...(entry.sourceFiles ?? []).map(({ file }) => file),
      ...(entry.sections ?? [])
        .flatMap(({ items }) => items ?? [])
        .flatMap((item) => item.checks ?? []),
    ];
    for (const pointer of pointers) {
      const href = typeof pointer === "string" ? pointer : pointer.href;
      if (!href || /^[a-z]+:/.test(href)) {
        continue;
      }
      const url = new URL(href, `file://${path}`);
      const [file, story] = [url.pathname, url.hash.slice(1)];
      expect(files, href).toContain(file);
      if (story) {
        expect(await sources[file](), href).toMatch(new RegExp(`export const ${story}\\b`));
      }
    }
  });

  it("shows people every guidelines section but those for agents", () => {
    const markdown = guidelinesMarkdown(tag);
    for (const section of entry.sections ?? []) {
      for (const item of section.items ?? []) {
        const shown = markdown.includes(item.statement!.split(" ").slice(0, 4).join(" "));
        expect(shown, item.statement).toBe(section.for !== "agent");
      }
    }
    for (const trait of entry.traits ?? []) {
      for (const value of trait.values ?? []) {
        expect(markdown).toContain(`\`${value.id}\` : ${value.description}`);
      }
    }
    expect(markdown).not.toContain("dsds:");
  });
});
