// The A2UI catalog's document (ADR 0052), generated from the base's
// documentation: its schemas, its instructions, a design system's layer, and
// what the A2UI renderer reads from it.
import { Catalog } from "@a2ui/web_core";
import { extendDocs, type DesignSystemDocs } from "@unicorne/catalog";
import { loadSocleDocs } from "@unicorne/catalog/socle";
import { beforeAll, describe, expect, it } from "vitest";
import committed from "../a2ui-catalog.json" with { type: "json" };
import { a2uiCatalogDocument, a2uiCommand, type A2uiCatalogDocument } from "./document.ts";

const catalogId = "https://unicorne.example/a2ui/v1/catalog.json";
let socle: DesignSystemDocs;
let document: A2uiCatalogDocument;

/** The schema of a property of an A2UI component. */
const property = (component: string, name: string) =>
  (document.components[component]!.properties as Record<string, Record<string, unknown>>)[name];

beforeAll(async () => {
  socle = await loadSocleDocs();
  document = a2uiCatalogDocument(socle, { catalogId });
});

describe("the base's A2UI catalog", () => {
  it("is the committed file: `npm run a2ui` writes it", () => {
    expect(JSON.parse(JSON.stringify(document))).toEqual(committed);
  });

  it("is a v1.0 catalog the A2UI renderer reads, unchanged", () => {
    const catalog = Catalog.fromJson(document as unknown as Record<string, unknown>);
    expect(catalog.id).toBe(catalogId);
    expect(catalog.protocolVersion).toBe("1.0");
    expect([...catalog.components.keys()]).toEqual(Object.keys(document.components));
    expect(catalog.instructions).toBe(document.instructions);
  });

  it("gives each attribute its type, its values and its default, from the documentation", () => {
    const button = socle.components.find((component) => component.name === "button")!;
    const variant = button.attributes.find((attribute) => attribute.name === "variant")!;
    expect(property("Button", "variant")).toMatchObject({
      type: "string",
      enum: variant.values,
      default: "primary",
    });
    expect(property("Button", "disabled")).toMatchObject({
      $ref: "common_types.json#/$defs/DynamicBoolean",
    });
    expect(property("Textarea", "rows")).toMatchObject({
      $ref: "common_types.json#/$defs/DynamicNumber",
    });
  });

  it("names a property by its JavaScript name, and requires what `check` requires", () => {
    expect(property("TextField", "errorMessage")).toBeDefined();
    expect(property("TextField", "error-message")).toBeUndefined();
    expect(document.components.TextField!.required).toEqual(["component", "label"]);
    expect(document.components.Button!.required).toEqual(["component", "text"]);
    expect(document.components.Select!.required).toEqual(["component", "options", "label"]);
  });

  it("binds the value of a field, and gives a button its action", () => {
    expect(property("TextField", "value")).toMatchObject({
      $ref: "common_types.json#/$defs/DynamicString",
    });
    expect(property("Checkbox", "checked")).toMatchObject({
      $ref: "common_types.json#/$defs/DynamicBoolean",
    });
    expect(property("Button", "action")).toMatchObject({
      $ref: "common_types.json#/$defs/Action",
    });
  });

  it("lists the icons, the spacing tokens and the text styles of the design system", () => {
    expect(property("Icon", "name")!.enum).toEqual(socle.icons.map((icon) => icon.name));
    expect(property("Row", "gap")!.enum).toEqual(["2xs", "xs", "sm", "md", "lg", "xl", "2xl"]);
    expect(property("Text", "style")!.enum).toEqual(
      expect.arrayContaining(["heading-xl", "body-md"]),
    );
  });

  it("derives schemas that reject a value outside the documentation", () => {
    const catalog = Catalog.fromJson(document as unknown as Record<string, unknown>);
    const button = catalog.components.get("Button")!.schema;
    expect(button.safeParse({ text: "Envoyer", variant: "danger" }).success).toBe(true);
    expect(button.safeParse({ text: "Envoyer", variant: "pink" }).success).toBe(false);
    const field = catalog.components.get("TextField")!.schema;
    expect(field.safeParse({ label: "Nom", value: { "@path": "/form/name" } }).success).toBe(true);
  });
});

describe("the instructions", () => {
  const lines = () => document.instructions.split("\n");

  it("are the usage rules, with the names of the A2UI catalog", () => {
    expect(lines()).toContain(
      "- TextField (should): Pour un texte sur plusieurs lignes, utilisez `Textarea`.",
    );
    expect(document.instructions).toContain("`errorMessage`");
    expect(document.instructions).not.toMatch(/`(text-field|u-button|error-message)`/);
  });

  it("leave out what an agent can't apply", () => {
    // A rule `check` reads in the markup, and one for agents that write it.
    expect(document.instructions).not.toContain("<label>");
    expect(document.instructions).not.toContain("N'enveloppez pas");
    // An attribute the agent doesn't set, and a component the catalog lacks.
    expect(document.instructions).not.toContain("label-hidden");
    expect(document.instructions).not.toContain("button-link");
  });
});

describe("a design system's A2UI catalog", () => {
  it("offers the mappings of its catalog, and its own, and leaves out those it removes", () => {
    const acme = extendDocs(socle, {
      name: "ACME",
      prefix: "acme",
      package: "@acme/design-system",
      catalog: ["button", "text-field", "notice", "badge"],
    });
    const brand = a2uiCatalogDocument(acme, {
      catalogId: "https://acme.example/a2ui/v1/catalog.json",
      mappings: {
        Badge: null,
        Notice: { component: "notice", attributes: ["variant"], text: "text" },
      },
    });
    expect(Object.keys(brand.components)).toEqual([
      "Column",
      "Row",
      "Text",
      "Button",
      "TextField",
      "Notice",
    ]);
    expect(brand.title).toBe("ACME components");
    expect(brand.instructions).not.toContain("acme-");
  });

  it("fails on a mapping that names an attribute its component lacks", () => {
    expect(() =>
      a2uiCatalogDocument(socle, {
        catalogId,
        mappings: { Button: { component: "button", attributes: ["colour"] } },
      }),
    ).toThrow(/u-button has no attribute "colour"/);
  });

  it("is what the `a2ui` command of its command line prints", () => {
    const printed: string[] = [];
    const command = a2uiCommand({ catalogId });
    expect(command.run([], { docs: socle, out: (text) => printed.push(text) })).toBe(0);
    expect(JSON.parse(printed.join(""))).toEqual(JSON.parse(JSON.stringify(document)));
  });
});
