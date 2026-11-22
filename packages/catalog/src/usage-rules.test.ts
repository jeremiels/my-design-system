// The rules of `check` that usage rules turn on (ADR 0040), on a base of a
// few components, and on the base's own documents. Node.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkMarkup,
  createDocs,
  defaultRules,
  extendDocs,
  findComponent,
  formatComponent,
  formatDiagnostics,
  readUsage,
  type CustomElementsManifest,
} from "./index.ts";
import { loadSocleDocs } from "./socle.ts";

/** A custom element of the fixture, with its attributes. */
const element = (name: string, attributes: string[] = [], slots: string[] = [""]) => ({
  kind: "class",
  name,
  tagName: `x-${name.toLowerCase()}`,
  customElement: true,
  summary: `A ${name}.`,
  attributes: attributes.map((attribute) => ({
    name: attribute,
    type: { text: "string" },
    fieldName: attribute,
    description: "An attribute.",
  })),
  slots: slots.map((slot) => ({ name: slot, description: "A slot." })),
});

const manifest: CustomElementsManifest = {
  modules: [
    {
      declarations: [
        element("Field", ["label"]),
        element("Group", ["label"]),
        element("Item", ["label"]),
        element("Button", ["label"], ["", "start"]),
        element("Tip", [], ["", "content"]),
      ],
    },
  ],
};

/** A guideline of a DSDS document that turns on `rule` with `options`. */
const checked = (level: string, statement: string, rule: string, options: string) => `
      - level: ${level}
        statement: ${statement}
        checks:
          - href: npm:@base/catalog#${rule}
            role: lint-rule
        checkedBy: automated
        $extensions:
          dev.unicorne:
            check: ${options}`;

const documents: Record<string, string> = {
  "root.dsds.yaml": ["field", "group", "item", "button", "tip"]
    .map((name) => `  - href: ./${name}.dsds.yaml\n    rel: file`)
    .join("\n")
    .replace(/^/, "refs:\n"),
  "field.dsds.yaml": `kind: component
id: field
sections:
  - kind: guidelines
    items:${checked("must", "Donnez au champ un `label`.", "required-attribute", "{ attributes: [label] }")}${checked("must-not", "N'enveloppez pas le champ dans un `<label>`.", "forbidden-ancestor", "{ elements: [label] }")}
`,
  "group.dsds.yaml": `kind: component
id: group
sections:
  - kind: guidelines
    items:${checked("should", "Donnez au groupe un `label`.", "required-attribute", "{ attributes: [label] }")}
`,
  "item.dsds.yaml": `kind: component
id: item
sections:
  - kind: guidelines
    items:${checked("must", "Placez `x-item` dans `x-group`.", "required-parent", "{ components: [group] }")}
`,
  "button.dsds.yaml": `kind: component
id: button
sections:
  - kind: guidelines
    items:${checked("must", "Donnez au bouton un libellé, ou un `label`.", "accessible-name", "{ attributes: [label] }")}
`,
  "tip.dsds.yaml": `kind: component
id: tip
sections:
  - kind: guidelines
    items:${checked("must", "Le déclencheur est un `<button>` ou un `<a>`.", "allowed-children", "{ elements: [button, a] }")}
`,
};

const folder = await mkdtemp(join(tmpdir(), "usage-rules-"));
for (const [name, content] of Object.entries(documents)) {
  await writeFile(join(folder, name), content);
}

const docs = createDocs({
  name: "Base",
  prefix: "x",
  package: "@base/components",
  manifest,
  usage: await readUsage(join(folder, "root.dsds.yaml")),
});

/** The rules `check` reports in `markup`, with their lines: `required-attribute:2`. */
const found = (markup: string, file?: string, on = docs) =>
  checkMarkup(on, markup, file ? { file } : {}).map(({ rule, line }) => `${rule}:${line}`);

/** A Vue file around a template. */
const vue = (template: string) =>
  `<script setup lang="ts"></script>\n\n<template>\n${template}\n</template>\n`;

describe("the usage rules of check", () => {
  it("reads the rule and the options of a guideline", () => {
    expect(findComponent(docs, "field")!.guidelines[0]!.check).toEqual({
      rule: "required-attribute",
      options: { attributes: ["label"] },
    });
  });

  it("requires an attribute, set to something, by any binding", () => {
    expect(
      found(`<x-field></x-field>\n<x-field label=""></x-field>\n<x-field label="Name"></x-field>`),
    ).toEqual(["required-attribute:1", "required-attribute:2"]);
    expect(
      found(
        vue(`<x-field :label="name"></x-field>\n<x-field v-bind="attrs"></x-field>`),
        "Form.vue",
      ),
    ).toEqual([]);
    expect(found("<x-field .label=${name}></x-field>")).toEqual([]);
  });

  it("reports an error for a must, a warning for a should, and quotes the guideline", () => {
    const [field, group] = checkMarkup(docs, `<x-field></x-field>\n<x-group></x-group>`);
    expect(field).toMatchObject({
      severity: "error",
      message: '<x-field> needs "label".',
      guideline: "Donnez au champ un `label`.",
    });
    expect(group).toMatchObject({ rule: "required-attribute", severity: "warning" });
    expect(formatDiagnostics([field!])).toContain(
      'needs "label". (required-attribute)\n  Donnez au champ un `label`.',
    );
  });

  it("forbids an ancestor", () => {
    expect(found(`<label>Name\n  <span><x-field label="Name"></x-field></span>\n</label>`)).toEqual(
      ["forbidden-ancestor:2"],
    );
  });

  it("requires a direct parent, but at the top of the markup or in an element it doesn't know", () => {
    expect(found(`<x-group label="g">\n  <div><x-item></x-item></div>\n</x-group>`)).toEqual([
      "required-parent:2",
    ]);
    expect(
      found(
        `<x-group label="g"><x-item></x-item></x-group>\n<x-item></x-item>\n<my-list><x-item></x-item></my-list>`,
      ),
    ).toEqual([]);
    // A Vue template: `<template v-for>` vanishes, a self-closing tag closes, a component may hold it.
    expect(
      found(
        vue(
          `<x-group label="g">\n  <template v-for="i in items"><x-item /><x-item /></template>\n</x-group>\n<ItemList><x-item /></ItemList>`,
        ),
        "List.vue",
      ),
    ).toEqual([]);
  });

  it("requires a name: a text, or the attribute that names", () => {
    expect(
      found(
        `<x-button></x-button>\n<x-button><span slot="start">★</span></x-button>\n<x-button>Save</x-button>\n<x-button label="Save"></x-button>\n<x-button><b>Go</b></x-button>`,
      ),
    ).toEqual(["accessible-name:1", "accessible-name:2"]);
    expect(
      found(
        vue(`<x-button>{{ t("save") }}</x-button>\n<x-button v-text="label"></x-button>`),
        "A.vue",
      ),
    ).toEqual([]);
  });

  it("allows some children in the default slot, at their place", () => {
    expect(
      found(
        `<x-tip>\n  <x-button>Go</x-button>\n  <span slot="content">Help</span>\n</x-tip>\n<x-tip><button>Go</button><span slot="content">Help</span></x-tip>\n<x-tip><MyButton></MyButton></x-tip>`,
      ),
    ).toEqual(["allowed-children:2"]);
  });

  it("checks the components of a design system under its tags, and leaves a rule out by id", () => {
    const acme = extendDocs(docs, { name: "ACME", prefix: "acme", package: "@acme/x" });
    const [diagnostic] = checkMarkup(
      acme,
      `<acme-group label="g"><p><acme-item></acme-item></p></acme-group>`,
    );
    expect(diagnostic).toMatchObject({
      rule: "required-parent",
      message: "<acme-item> goes directly in <acme-group>, not in <p>.",
      guideline: "Placez `acme-item` dans `acme-group`.",
    });
    const without = extendDocs(docs, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/x",
      withoutRules: ["required-parent"],
    });
    expect(
      found(
        `<acme-group label="g"><p><acme-item></acme-item></p></acme-group>`,
        undefined,
        without,
      ),
    ).toEqual([]);
  });

  it("says which rules check_markup checks", () => {
    expect(formatComponent(docs, findComponent(docs, "field")!, "agent")).toContain(
      "Donnez au champ un `label`. _Checked by check_markup._",
    );
  });
});

describe("the base's checked usage rules", async () => {
  const socle = await loadSocleDocs();
  const rules = new Set(defaultRules.map(({ id }) => id));
  const checks = socle.components.flatMap((component) =>
    component.guidelines.flatMap(({ check, statement }) =>
      check ? [{ component, check, statement }] : [],
    ),
  );

  it("checks a rule of every component that needs a label, a parent or a name", () => {
    expect(checks.length).toBeGreaterThan(50);
  });

  it.each(checks.map((entry) => [`${entry.component.name}: ${entry.check.rule}`, entry] as const))(
    "%s names a rule of check, and what it names exists",
    (_, { component, check }) => {
      expect(rules).toContain(check.rule);
      const {
        attributes = [],
        components = [],
        elements = [],
      } = check.options as Record<string, string[]>;
      for (const attribute of attributes) {
        expect(component.attributes.map(({ name }) => name)).toContain(attribute);
      }
      for (const name of components) {
        expect(findComponent(socle, name), name).toBeDefined();
      }
      for (const name of elements) {
        expect(name).toMatch(/^[a-z][a-z0-9]*$/);
      }
      expect(
        attributes.length + components.length + elements.length > 0 ||
          check.rule === "accessible-name",
      ).toBe(true);
    },
  );
});
