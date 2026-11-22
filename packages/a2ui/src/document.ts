/**
 * The A2UI catalog of a design system, as a document (ADR 0052): generated
 * from its documentation (`@unicorne/catalog`) and its mappings. The agent
 * reads it to know the components it may place, and the renderer reads it to
 * validate what the agent sends. Imports nothing but types: it runs in Node,
 * in the build of a design system.
 */
import type { ComponentDoc, DesignSystemDocs, Guideline, Member } from "@unicorne/catalog";
import {
  isComponentMapping,
  mergeMappings,
  socleMappings,
  type A2uiMappingLayer,
  type A2uiMappings,
  type ComponentMapping,
} from "./mappings.ts";

export {
  isComponentMapping,
  mergeMappings,
  socleMappings,
  type A2uiMapping,
  type A2uiMappingLayer,
  type A2uiMappings,
  type ComponentMapping,
  type OwnMapping,
} from "./mappings.ts";

/** A JSON Schema, as the catalog writes it. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** An A2UI catalog document, protocol version 1.0. */
export interface A2uiCatalogDocument {
  readonly $schema: string;
  readonly $id: string;
  readonly catalogId: string;
  readonly protocolVersion: "1.0";
  readonly title: string;
  readonly description?: string;
  /** Markdown the agent adds to its prompt: the usage rules of the components. */
  readonly instructions: string;
  /** The schema of each component, by A2UI name. */
  readonly components: Readonly<Record<string, JsonSchema>>;
  readonly $defs: Readonly<Record<string, JsonSchema>>;
}

/** The options of `a2uiCatalogDocument()`. */
export interface A2uiDocumentOptions {
  /**
   * The ID the agent and the renderer share: a URI, versioned at each
   * breaking change, `https://acme.example/a2ui/v1/catalog.json`.
   */
  readonly catalogId: string;
  /** Mappings to add to the base's, or to replace; `null` removes one. */
  readonly mappings?: A2uiMappingLayer;
}

const common = (name: string) => ({ $ref: `common_types.json#/$defs/${name}` });

/** The A2UI type of a member, from its type in the manifest. */
function dynamicOf(member: Member): string {
  const type = member.type ?? "";
  if (/^boolean\b/.test(type)) {
    return "DynamicBoolean";
  }
  if (/^number\b/.test(type)) {
    return "DynamicNumber";
  }
  return "DynamicString";
}

/** A default as the manifest writes it, `"primary"` or `false`, as a value; `undefined` for none. */
function defaultOf(member: Member): unknown {
  if (member.default === undefined || member.default === "undefined") {
    return undefined;
  }
  try {
    return JSON.parse(member.default) as unknown;
  } catch {
    return undefined;
  }
}

/** The schema of an attribute: its values as an `enum`, or a value the agent may bind. */
function attributeSchema(member: Member): JsonSchema {
  const description = member.description;
  if (member.values) {
    const fallback = defaultOf(member);
    return {
      type: "string",
      enum: [...member.values],
      ...(typeof fallback === "string" ? { default: fallback } : {}),
      ...(description ? { description } : {}),
    };
  }
  return { ...common(dynamicOf(member)), ...(description ? { description } : {}) };
}

/** The names of the components of a check option, as A2UI names; those without one left out. */
const a2uiNames = (option: unknown, names: ReadonlyMap<string, string>) =>
  Array.isArray(option)
    ? option.flatMap((name) =>
        typeof name === "string" && names.has(name) ? [names.get(name)!] : [],
      )
    : [];

interface Built {
  readonly schema: JsonSchema;
  /** Its attributes an agent sets, by attribute and by property name. */
  readonly exposed: ReadonlySet<string>;
}

/** The schema of an A2UI component that renders `doc`. */
function componentSchema(
  name: string,
  mapping: ComponentMapping,
  doc: ComponentDoc,
  docs: DesignSystemDocs,
  names: ReadonlyMap<string, string>,
): Built {
  const properties: Record<string, JsonSchema> = { component: { const: name } };
  const required = new Set(["component"]);
  const exposed = new Set<string>();
  const memberOf = (attribute: string) => {
    const member = doc.attributes.find(
      (candidate) => candidate.name === attribute || candidate.property === attribute,
    );
    if (!member) {
      throw new Error(`A2UI mapping ${name}: ${doc.tag} has no attribute "${attribute}".`);
    }
    return member;
  };

  for (const attribute of mapping.attributes ?? []) {
    const member = memberOf(attribute);
    const key = member.property ?? member.name;
    exposed.add(member.name).add(key);
    properties[key] = mapping.icons?.includes(attribute)
      ? {
          type: "string",
          enum: docs.icons.map((icon) => icon.name),
          ...(member.description ? { description: member.description } : {}),
        }
      : attributeSchema(member);
  }
  const slot = doc.slots.find((candidate) => candidate.name === "")?.description;
  if (mapping.text) {
    properties[mapping.text] = { ...common("DynamicString"), description: slot ?? "Its text." };
    required.add(mapping.text);
  }
  if (mapping.children === "child") {
    properties.child = { ...common("Child"), description: slot ?? "Its content." };
    required.add("child");
  } else if (mapping.children === "children") {
    properties.children = { ...common("ChildList"), description: slot ?? "Its content." };
  }
  if (mapping.value) {
    const member = memberOf(mapping.value.property);
    exposed.add(member.name).add(mapping.value.property);
    properties[mapping.value.property] = {
      ...common(dynamicOf(member)),
      description:
        `${member.description ?? ""} Bind it to a path of the data model: ` +
        `the component writes the user's input there.`.trim(),
    };
  }
  if (mapping.options) {
    properties.options = {
      type: "array",
      description: "The options the user chooses from: a value, and the label the user reads.",
      items: {
        type: "object",
        properties: { value: { type: "string" }, label: { type: "string" } },
        required: ["value", "label"],
      },
    };
    required.add("options");
  }
  if (mapping.action) {
    properties.action = {
      ...common("Action"),
      description: "What the agent receives when the user activates it.",
    };
  }

  const schema: Record<string, unknown> = {
    type: "object",
    description: doc.summary,
    properties,
  };
  for (const { check } of doc.guidelines) {
    if (check?.rule === "required-attribute") {
      for (const attribute of (check.options.attributes as unknown[] | undefined) ?? []) {
        const member = doc.attributes.find((candidate) => candidate.name === attribute);
        const key = member?.property ?? member?.name;
        if (key && key in properties) {
          required.add(key);
        }
      }
    }
    if (check?.rule === "required-parent") {
      const parents = a2uiNames(check.options.components, names);
      if (parents.length > 0) {
        schema.allowedParents = parents;
      }
    }
    if (check?.rule === "allowed-children") {
      const children = a2uiNames(check.options.components, names);
      if (children.length > 0) {
        schema.allowedChildren = children;
      }
    }
  }
  schema.required = [...required];
  return { schema, exposed };
}

/**
 * The usage rules of a component, for the agent: those for everyone, with
 * the names of the A2UI catalog. A rule the agent can't apply is left out:
 * a rule `check` reads in the markup (`required-attribute` becomes
 * `required`), a rule for an agent that writes markup (`for: agent`), and a
 * rule that names an attribute the agent doesn't set, a component the catalog
 * doesn't have, or an HTML element.
 */
function instructionsOf(
  name: string,
  doc: ComponentDoc,
  exposed: ReadonlySet<string>,
  names: ReadonlyMap<string, string>,
  components: ReadonlySet<string>,
): string[] {
  const attributes = new Map(
    doc.attributes.flatMap((member) => [
      [member.name, member.property ?? member.name],
      [member.property ?? member.name, member.property ?? member.name],
    ]),
  );
  const usable = (guideline: Guideline) =>
    guideline.scope === "users" && guideline.audience === "all" && !guideline.check;
  return doc.guidelines.filter(usable).flatMap((guideline) => {
    let applies = true;
    const statement = guideline.statement.replace(/`([^`]+)`/g, (code, text: string) => {
      if (names.has(text)) {
        return `\`${names.get(text)}\``;
      }
      const attribute = text.split("=")[0]!;
      if (text.startsWith("<") || components.has(text)) {
        applies = false;
      } else if (attributes.has(attribute)) {
        if (!exposed.has(attribute)) {
          applies = false;
        }
        return `\`${attributes.get(attribute)}${text.slice(attribute.length)}\``;
      }
      return code;
    });
    return applies ? [`- ${name} (${guideline.level}): ${statement}`] : [];
  });
}

/**
 * The A2UI catalog of a design system (ADR 0052): an A2UI component for each
 * mapping whose component is in its documentation, with the type, the values
 * and the description of each attribute, and the usage rules an agent can
 * apply as `instructions`. Its own components complete it: `Row` and `Column`,
 * whose `gap` is a spacing token, and `Text`, in a text style.
 *
 * @throws When a mapping names an attribute its component doesn't have.
 *
 * @example
 * const document = a2uiCatalogDocument(await loadAcmeDocs(), {
 *   catalogId: "https://acme.example/a2ui/v1/catalog.json",
 *   mappings: { Card: { component: "card", attributes: ["heading"], children: "children" } },
 * });
 */
export function a2uiCatalogDocument(
  docs: DesignSystemDocs,
  options: A2uiDocumentOptions,
): A2uiCatalogDocument {
  const mappings = offeredMappings(docs, mergeMappings(socleMappings, options.mappings));
  const byName = new Map(docs.components.map((doc) => [doc.name, doc]));
  // Component name and tag → A2UI name, to rewrite the rules.
  const names = new Map<string, string>();
  for (const [name, mapping] of Object.entries(mappings)) {
    if (isComponentMapping(mapping)) {
      names.set(mapping.component, name).set(byName.get(mapping.component)!.tag, name);
    }
  }
  const components = new Set(docs.components.flatMap((doc) => [doc.name, doc.tag]));

  const schemas: Record<string, JsonSchema> = {};
  const instructions: string[] = [];
  const spacing = docs.tokens
    .filter((token) => token.group === "spacing" && token.level === "semantic")
    .map((token) => token.id.slice("spacing.".length));
  const styles = docs.tokens
    .filter((token) => token.type === "typography" && token.level === "semantic")
    .map((token) => token.id.replace(/^text\./, "").replaceAll(".", "-"));

  for (const [name, mapping] of Object.entries(mappings)) {
    if (isComponentMapping(mapping)) {
      const doc = byName.get(mapping.component)!;
      const { schema, exposed } = componentSchema(name, mapping, doc, docs, names);
      schemas[name] = schema;
      instructions.push(...instructionsOf(name, doc, exposed, names, components));
    } else if (mapping.kind === "text") {
      schemas[name] = textSchema(name, styles);
    } else {
      schemas[name] = stackSchema(name, mapping.kind, spacing);
    }
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: options.catalogId,
    catalogId: options.catalogId,
    protocolVersion: "1.0",
    title: `${docs.name} components`,
    ...(docs.description ? { description: docs.description } : {}),
    instructions: [
      `Rules for the components of ${docs.name}, from its documentation.`,
      `"must" and "must-not" rules are mandatory.`,
      "",
      ...instructions,
    ].join("\n"),
    components: schemas,
    $defs: {
      anyComponent: {
        oneOf: Object.keys(schemas).map((name) => ({ $ref: `#/components/${name}` })),
        discriminator: { propertyName: "component" },
      },
      anyFunction: { not: {} },
    },
  };
}

/** The mappings a design system offers: its own, and those of components in its documentation. */
function offeredMappings(docs: DesignSystemDocs, mappings: A2uiMappings): A2uiMappings {
  const has = (component: string) => docs.components.some((doc) => doc.name === component);
  return Object.fromEntries(
    Object.entries(mappings).filter(
      ([, mapping]) =>
        !isComponentMapping(mapping) ||
        (has(mapping.component) &&
          (!mapping.options ||
            !("component" in mapping.options) ||
            has(mapping.options.component))),
    ),
  );
}

/** `Row` or `Column`: its children, with a spacing token between them. */
function stackSchema(name: string, kind: "row" | "column", spacing: readonly string[]): JsonSchema {
  const gap = spacing.includes("md") ? "md" : spacing[0];
  return {
    type: "object",
    description:
      kind === "row"
        ? "Lays out its children side by side, without border or background."
        : "Lays out its children one below the other, without border or background.",
    properties: {
      component: { const: name },
      children: common("ChildList"),
      ...(spacing.length > 0
        ? {
            gap: {
              type: "string",
              enum: [...spacing],
              default: gap,
              description: "The space between the children: a spacing token of the design system.",
            },
          }
        : {}),
      align: {
        type: "string",
        enum: ["start", "center", "end", "stretch"],
        default: kind === "row" ? "end" : "stretch",
        description:
          kind === "row"
            ? "How the children line up vertically. `end` aligns fields and buttons on their bottom."
            : "How the children line up horizontally. `stretch` gives them the full width.",
      },
    },
    required: ["component", "children"],
  };
}

/** `Text`: plain text in a text style of the design system, or a heading. */
function textSchema(name: string, styles: readonly string[]): JsonSchema {
  return {
    type: "object",
    description: "Plain text, in a text style of the design system. Markdown isn't read.",
    properties: {
      component: { const: name },
      text: common("DynamicString"),
      ...(styles.length > 0
        ? {
            style: {
              type: "string",
              enum: [...styles],
              ...(styles.includes("body-md") ? { default: "body-md" } : {}),
              description: "A text style of the design system.",
            },
          }
        : {}),
      level: {
        type: "integer",
        minimum: 1,
        maximum: 6,
        description: "Makes the text a heading of this level, in the outline of the page.",
      },
    },
    required: ["component", "text"],
  };
}

/** What `a2uiCommand()` receives from the command line: `createCli()`'s context. */
export interface A2uiCommandContext {
  readonly docs: DesignSystemDocs;
  out(text: string): void;
}

/**
 * A command of a design system's command line (`createCli()` of
 * `@unicorne/cli`) that prints its A2UI catalog as JSON. Its build writes the
 * file: `acme a2ui > a2ui-catalog.json`.
 *
 * @example
 * createCli({
 *   name: "acme",
 *   docs: loadAcmeDocs,
 *   commands: { a2ui: a2uiCommand({ catalogId, mappings: acmeMappings }) },
 * });
 */
export function a2uiCommand(options: A2uiDocumentOptions) {
  return {
    summary: "Prints the A2UI catalog of the design system, for agents and renderers (JSON).",
    run(_args: readonly string[], { docs, out }: A2uiCommandContext): number {
      out(JSON.stringify(a2uiCatalogDocument(docs, options), null, 2));
      return 0;
    },
  };
}
