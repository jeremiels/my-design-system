// The documentation of a design system, and the one a design system builds
// on it (ADR 0039). Node.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkMarkup,
  createDocs,
  extendDocs,
  findComponent,
  formatComponent,
  readUsage,
  searchDocs,
  type CustomElementsManifest,
  type Rule,
} from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

/** A base of two components, `x-button` and `x-select`, which fires `x-select`. */
const manifest: CustomElementsManifest = {
  modules: [
    {
      declarations: [
        {
          kind: "class",
          name: "Button",
          tagName: "x-button",
          customElement: true,
          summary: "Triggers an action.",
          description:
            "A button (ADR 0008). Its look is that of `ButtonBase`. Wrap no `x-button` in a link.",
          attributes: [
            {
              name: "variant",
              type: { text: '"primary" | "neutral"' },
              default: '"primary"',
              fieldName: "variant",
              description: "Its intent.",
            },
            {
              name: "close-label",
              type: { text: "string" },
              default: '"Close"',
              fieldName: "closeLabel",
              description: "The name of its close icon.",
            },
          ],
          members: [
            { kind: "field", name: "variant", description: "Its intent." },
            {
              kind: "field",
              name: "resultsMessage",
              description: "Writes a message. Property only.",
            },
            { kind: "field", name: "secret", privacy: "private", description: "Not documented." },
            { kind: "method", name: "focus", description: "Focuses it." },
          ],
          events: [{ name: "click", description: "The click." }],
          slots: [
            { name: "", description: "The label." },
            { name: "icon", description: "An icon." },
          ],
          cssProperties: [{ name: "--x-button-color", default: "blue", description: "Its color." }],
        },
        {
          kind: "class",
          name: "Select",
          tagName: "x-select",
          customElement: true,
          summary: "Picks an option.",
          description: "Fires `x-select` when the user picks an option; an `x-button` opens it.",
          events: [{ name: "x-select", description: "A pick." }],
        },
      ],
    },
  ],
};

/** Writes YAML files in a new folder; returns the path of the first one. */
async function yamlFiles(files: Record<string, string>): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), "catalog-"));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(folder, name), content);
  }
  return join(folder, Object.keys(files)[0]!);
}

const baseUsage = await readUsage(
  await yamlFiles({
    "root.dsds.yaml": "refs:\n  - href: ./button.dsds.yaml\n    rel: file\n",
    "button.dsds.yaml": `kind: component
id: button
description: Un bouton.
sections:
  - kind: guidelines
    framing: when-to-use
    items:
      - level: must-not
        statement: N'utilisez pas \`button\` pour une page. Utilisez <dsds:select>.
        alternatives:
          - to: select
  - kind: guidelines
    title: Contributeurs
    items:
      - level: must
        statement: Rendez \`x-button\` par \`tagFor()\`.
        $extensions:
          dev.unicorne:
            audience: contributors
  - kind: guidelines
    for: agent
    items:
      - level: must-not
        statement: N'enveloppez pas \`x-button\` dans un lien.
`,
  }),
);

const base = createDocs({
  name: "Base",
  prefix: "x",
  package: "@base/components",
  manifest,
  usage: baseUsage,
  internal: [
    /\s*\(ADR \d{4}\)/g,
    (text) => text.replace(/ Its look is that of `ButtonBase`\./, ""),
  ],
});

describe("createDocs()", () => {
  it("documents the components of the manifest, and their usage", () => {
    const button = findComponent(base, "<x-button>")!;
    expect(button.className).toBe("Button");
    expect(button.attributes.map(({ name }) => name)).toEqual(["variant", "close-label"]);
    expect(button.attributes[0]!.values).toEqual(["primary", "neutral"]);
    // A property with an attribute is documented once; a private one not at all.
    expect(button.properties.map(({ name }) => name)).toEqual(["resultsMessage"]);
    expect(button.methods.map(({ name }) => name)).toEqual(["focus"]);
    expect(button.slots[0]!.name).toBe("");
    expect(button.usage).toBe("Un bouton.");
    expect(
      button.guidelines.map(({ scope, audience, framing }) => [scope, audience, framing]),
    ).toEqual([
      ["users", "all", "when-to-use"],
      ["contributors", "all", "how-to-use"],
      ["users", "agent", "how-to-use"],
    ]);
    // A link to an entry reads as its name.
    expect(button.guidelines[0]!.statement).toBe(
      "N'utilisez pas `button` pour une page. Utilisez `select`.",
    );
    expect(button.guidelines[0]!.alternatives).toEqual(["select"]);
  });
});

describe("extendDocs()", () => {
  const acmeManifest: CustomElementsManifest = {
    modules: [
      {
        declarations: [
          {
            kind: "class",
            name: "AcmeButton",
            tagName: "acme-button",
            customElement: true,
            summary: "ACME's button.",
            attributes: [
              {
                name: "pill",
                type: { text: "boolean" },
                fieldName: "pill",
                description: "Round corners.",
              },
            ],
          },
          {
            kind: "class",
            name: "AcmeCard",
            tagName: "acme-card",
            customElement: true,
            summary: "A card.",
          },
        ],
      },
    ],
  };
  const acme = extendDocs(base, {
    name: "ACME",
    prefix: "acme",
    package: "@acme/design-system",
    catalog: ["button"],
    manifest: acmeManifest,
    labels: { closeLabel: "Fermer" },
    withoutRules: ["unknown-event"],
  });

  it("offers its catalog, its components and its overrides, under its prefix", () => {
    expect(acme.components.map(({ tag }) => tag)).toEqual(["acme-button", "acme-card"]);
    const button = findComponent(acme, "button")!;
    // An override registers under the base's class.
    expect(button.className).toBe("Button");
    expect(button.summary).toBe("ACME's button.");
    expect(button.description).toBe("A button. Wrap no `acme-button` in a link.");
    expect(button.attributes.map(({ name }) => name)).toEqual(["variant", "close-label", "pill"]);
    // Its texts are the defaults of its labels.
    expect(button.attributes[1]!.default).toBe('"Fermer"');
  });

  it("speaks of itself only: its tags, its package, no internal reference, no contributor rule", () => {
    const button = findComponent(acme, "acme-button")!;
    expect(button.description).toBe("A button. Wrap no `acme-button` in a link.");
    expect(button.guidelines.map(({ scope }) => scope)).toEqual(["users", "users"]);
    expect(button.guidelines[1]!.statement).toBe("N'enveloppez pas `acme-button` dans un lien.");
    expect(acme.importCode(button)).toBe('import { Button } from "@acme/design-system";');
    expect(acme.rules.map(({ id }) => id)).not.toContain("unknown-event");
  });

  it("keeps the name of an event that looks like a tag: `x-select` is the event of every design system", () => {
    const withSelect = extendDocs(base, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
    });
    expect(findComponent(withSelect, "select")!.description).toBe(
      "Fires `x-select` when the user picks an option; an `acme-button` opens it.",
    );
  });
});

describe("searchDocs()", () => {
  it("finds every word, without case nor accents, the best first", () => {
    expect(searchDocs(base, "ACTION").map(({ component }) => component.name)).toEqual(["button"]);
    expect(searchDocs(base, "enveloppez lien")[0]!.matches).toEqual([
      "rule: N'enveloppez pas `x-button` dans un lien.",
    ]);
    expect(searchDocs(base, "nothing here")).toEqual([]);
  });
});

describe("checkMarkup()", () => {
  it("reports unknown tags, attributes, values, events and slots, with their place", () => {
    const diagnostics = checkMarkup(
      base,
      `<x-button variant="big" colour="red" aria-label="ok" data-id="1">
  <span slot="nope"></span>
</x-button>
<x-nothing></x-nothing>
<x-select @x-select="pick" @custom="f"></x-select>`,
    );
    expect(diagnostics.map(({ rule, line }) => `${rule}:${line}`)).toEqual([
      "invalid-value:1",
      "unknown-attribute:1",
      "unknown-slot:2",
      "unknown-element:4",
      "unknown-event:5",
    ]);
  });

  it("reads the template of a Vue file, and its bindings", () => {
    const diagnostics = checkMarkup(
      base,
      `<script setup lang="ts">
const x = 1;
</script>

<template>
  <div v-if="x">
    <x-button :variant="variant" :closeLabel="label" v-model="value" @click="go">Go</x-button>
    <x-button :colour="c" variant="plain"></x-button>
  </div>
</template>
`,
      { file: "Form.vue" },
    );
    expect(diagnostics.map(({ rule, line, file }) => `${file}:${line}:${rule}`)).toEqual([
      "Form.vue:8:unknown-attribute",
      "Form.vue:8:invalid-value",
    ]);
  });

  it("runs the rules of the docs, a design system's own among them", () => {
    const noIcon: Rule = {
      id: "no-icon-slot",
      description: "ACME's buttons show no icon.",
      check(element, { report }) {
        if (
          element.children.some((child) => child.attributes.some(({ value }) => value === "icon"))
        ) {
          report({
            severity: "warning",
            message: "No icon.",
            line: element.line,
            column: element.column,
          });
        }
      },
    };
    const docs = extendDocs(base, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/x",
      rules: [noIcon],
    });
    expect(
      checkMarkup(docs, `<acme-button><span slot="icon"></span></acme-button>`).map(
        ({ rule }) => rule,
      ),
    ).toEqual(["no-icon-slot"]);
  });
});

describe("the base's documentation", async () => {
  const socle = await loadSocleDocs();

  it("documents every component of the base, with the rules of its DSDS documents", () => {
    expect(socle.components.length).toBeGreaterThan(50);
    const button = findComponent(socle, "u-button")!;
    expect(button.attributes.find(({ name }) => name === "variant")!.values).toContain("neutral");
    expect(button.guidelines.some(({ scope }) => scope === "contributors")).toBe(true);
    // Every component has a DSDS document, its sub-components too (ADR 0040).
    expect(socle.components.filter(({ usage }) => !usage).map(({ name }) => name)).toEqual([]);
  });

  it("leaves nothing of the base in a design system's view, but the names of its events and tokens", () => {
    const acme = extendDocs(socle, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
    });
    const text = acme.components
      .map((component) => formatComponent(acme, component, "agent"))
      .join("\n");
    // The events (`u-close`) and the custom properties (`--u-button-…`) are
    // the API of every design system: they keep their names.
    const leaks = text
      .replace(/`u-(?:close|cancel|select|toggle|sort|remove)`/g, "")
      .replace(/--u-[\w-]+/g, "")
      .match(/unicorne|socle|\bADR\b|<u-[a-z]|`u-[a-z]|`\w+(?:Base|Controller)`|the base/gi);
    expect(leaks).toBeNull();
  });
});
