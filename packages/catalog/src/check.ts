import { parseFragment } from "parse5";
import type {
  ComponentDoc,
  DesignSystemDocs,
  Diagnostic,
  MarkupAttribute,
  MarkupElement,
  Rule,
} from "./model.ts";

/** Attributes any element takes: they need no documentation. */
const GLOBAL_ATTRIBUTES = new Set([
  "id",
  "class",
  "style",
  "slot",
  "part",
  "exportparts",
  "hidden",
  "title",
  "lang",
  "dir",
  "tabindex",
  "role",
  "inert",
  "autofocus",
  "translate",
  "draggable",
  "accesskey",
  "popover",
  "key",
  "ref",
  "is",
]);

/** Events of the DOM any element fires. */
const DOM_EVENTS = new Set(
  (
    "click dblclick auxclick contextmenu input change beforeinput focus blur focusin focusout " +
    "keydown keyup pointerdown pointerup pointermove pointerover pointerout pointerenter " +
    "pointerleave pointercancel mousedown mouseup mousemove mouseover mouseout mouseenter " +
    "mouseleave wheel scroll touchstart touchend touchmove touchcancel transitionend " +
    "animationend invalid submit reset toggle copy cut paste drag dragstart dragend drop"
  ).split(" "),
);

/** A name compared without case nor dashes: `sort-key`, `sortKey` and `sortkey` match. */
const loose = (name: string) => name.toLowerCase().replaceAll("-", "");

/** The attribute or property of `component` that `name` names, if any. */
function memberOf(component: ComponentDoc, name: string) {
  const key = loose(name);
  return (
    component.attributes.find(
      (member) => loose(member.name) === key || (member.property && loose(member.property) === key),
    ) ?? component.properties.find((member) => loose(member.name) === key)
  );
}

/** Rule: an attribute or a property the component doesn't document. */
export const unknownAttribute: Rule = {
  id: "unknown-attribute",
  description: "An attribute or a property the component doesn't have.",
  check(element, { component, report }) {
    for (const attribute of element.attributes) {
      const { name, binding } = attribute;
      if (binding === "event" || binding === "directive") {
        continue;
      }
      if (
        GLOBAL_ATTRIBUTES.has(name) ||
        name.startsWith("aria-") ||
        name.startsWith("data-") ||
        name.startsWith("on")
      ) {
        continue;
      }
      if (!memberOf(component, name)) {
        report({
          severity: "error",
          message: `<${component.tag}> has no attribute nor property "${name}".`,
          line: attribute.line,
          column: attribute.column,
        });
      }
    }
  },
};

/** Rule: a value outside those an attribute takes. */
export const invalidValue: Rule = {
  id: "invalid-value",
  description: "A value an attribute doesn't take: one of its documented values.",
  check(element, { component, report }) {
    for (const attribute of element.attributes) {
      if (attribute.binding !== "attribute") {
        continue;
      }
      const values = memberOf(component, attribute.name)?.values;
      if (values && !values.includes(attribute.value)) {
        report({
          severity: "error",
          message: `${attribute.name}="${attribute.value}" on <${component.tag}>: expected ${values.map((value) => `"${value}"`).join(", ")}.`,
          line: attribute.line,
          column: attribute.column,
        });
      }
    }
  },
};

/** Rule: a listener of an event the component doesn't fire. */
export const unknownEvent: Rule = {
  id: "unknown-event",
  description: "A listener of an event the component doesn't fire.",
  check(element, { component, report }) {
    for (const attribute of element.attributes) {
      if (attribute.binding !== "event") {
        continue;
      }
      if (
        !DOM_EVENTS.has(attribute.name) &&
        !component.events.some(({ name }) => name === attribute.name)
      ) {
        report({
          severity: "warning",
          message: `<${component.tag}> fires no "${attribute.name}" event.`,
          line: attribute.line,
          column: attribute.column,
        });
      }
    }
  },
};

/** Rule: a child sent to a slot the component doesn't have. */
export const unknownSlot: Rule = {
  id: "unknown-slot",
  description: "A child sent to a slot the component doesn't have.",
  check(element, { component, report }) {
    for (const child of element.children) {
      const slot = child.attributes.find(
        ({ name, binding }) => name === "slot" && binding === "attribute",
      );
      if (slot && !component.slots.some(({ name }) => name === slot.value)) {
        report({
          severity: "warning",
          message: `<${component.tag}> has no slot "${slot.value}" for <${child.tag}>.`,
          line: slot.line,
          column: slot.column,
        });
      }
    }
  },
};

/** The rules of `check`, by default. */
export const defaultRules: readonly Rule[] = [
  unknownAttribute,
  invalidValue,
  unknownEvent,
  unknownSlot,
];

// The few parse5 shapes this module reads.
interface Location {
  startLine: number;
  startCol: number;
  attrs?: Record<string, { startLine: number; startCol: number }>;
}
interface Parse5Node {
  nodeName: string;
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Parse5Node[];
  content?: Parse5Node;
  sourceCodeLocation?: Location & { startTag?: Location };
}

/** An attribute as written, with its binding: Vue's and Lit's syntaxes. */
function attributeOf(raw: string, value: string, line: number, column: number): MarkupAttribute {
  const at = (name: string, binding: MarkupAttribute["binding"]): MarkupAttribute => ({
    name: name.replace(/\..*$/, binding === "event" ? "" : "$&"),
    value,
    binding,
    line,
    column,
  });
  if (raw.startsWith("@")) {
    return at(raw.slice(1), "event");
  }
  if (raw.startsWith("v-on:")) {
    return at(raw.slice(5), "event");
  }
  if (raw.startsWith(":")) {
    return at(raw.slice(1).replace(/\.(prop|camel|attr)$/, ""), "property");
  }
  if (raw.startsWith("v-bind:")) {
    return at(raw.slice(7).replace(/\.(prop|camel|attr)$/, ""), "property");
  }
  if (raw.startsWith(".")) {
    return at(raw.slice(1), "property");
  }
  if (raw.startsWith("?")) {
    return at(raw.slice(1), "boolean");
  }
  if (raw.startsWith("v-") || raw.startsWith("#")) {
    return at(raw, "directive");
  }
  // A Vue or Lit expression in a value: a binding, not a value to check.
  if (/\$\{|\{\{/.test(value)) {
    return at(raw, "property");
  }
  return at(raw, "attribute");
}

/** The template of a Vue single-file component, with the line it starts on. */
function vueTemplate(source: string): { markup: string; line: number } | undefined {
  const match = /^<template(\s[^>]*)?>\r?\n?([\s\S]*)^<\/template>/m.exec(source);
  if (!match) {
    return undefined;
  }
  const before = source.slice(0, match.index + match[0].indexOf(match[2]!));
  return { markup: match[2]!, line: before.split("\n").length };
}

/** Options of `checkMarkup()`. */
export interface CheckOptions {
  /** The file of the markup: a `.vue` file is checked in its `<template>`. */
  readonly file?: string;
  /** The rules: those of the docs by default. */
  readonly rules?: readonly Rule[];
}

/**
 * Checks the elements of the design system in HTML, or in the template of a
 * Vue component: an unknown tag, then the rules of the docs. Elements of
 * other prefixes aren't checked.
 */
export function checkMarkup(
  docs: DesignSystemDocs,
  source: string,
  options: CheckOptions = {},
): Diagnostic[] {
  const vue = options.file?.endsWith(".vue") ? vueTemplate(source) : undefined;
  if (options.file?.endsWith(".vue") && !vue) {
    return [];
  }
  const markup = vue ? vue.markup : source;
  const lineOffset = vue ? vue.line - 1 : 0;
  const rules = options.rules ?? docs.rules;
  const byTag = new Map(docs.components.map((component) => [component.tag, component]));
  const diagnostics: Diagnostic[] = [];
  const file = options.file;

  /** The elements under `node`, with their children. */
  const elementsOf = (node: Parse5Node): MarkupElement[] => {
    const nested = [...(node.childNodes ?? []), ...(node.content ? [node.content] : [])];
    if (!node.tagName) {
      return nested.flatMap(elementsOf);
    }
    const location = node.sourceCodeLocation;
    const tagLocation = location?.startTag ?? location;
    const line = (location?.startLine ?? 1) + lineOffset;
    const column = location?.startCol ?? 1;
    return [
      {
        tag: node.tagName,
        line,
        column,
        attributes: (node.attrs ?? []).map(({ name, value }) => {
          const at = tagLocation?.attrs?.[name];
          return attributeOf(
            name,
            value,
            at ? at.startLine + lineOffset : line,
            at?.startCol ?? column,
          );
        }),
        // A `<template>` of Vue or Lit holds its elements in `content`.
        children: nested.flatMap(elementsOf),
      },
    ];
  };

  const visit = (element: MarkupElement) => {
    if (element.tag.startsWith(`${docs.prefix}-`)) {
      const component = byTag.get(element.tag);
      if (!component) {
        diagnostics.push({
          rule: "unknown-element",
          severity: "error",
          message: `${docs.name} has no <${element.tag}>.`,
          ...(file ? { file } : {}),
          line: element.line,
          column: element.column,
        });
      } else {
        for (const rule of rules) {
          rule.check(element, {
            docs,
            component,
            report: (diagnostic) =>
              diagnostics.push({ ...diagnostic, rule: rule.id, ...(file ? { file } : {}) }),
          });
        }
      }
    }
    element.children.forEach(visit);
  };
  elementsOf(
    parseFragment(markup, { sourceCodeLocationInfo: true }) as unknown as Parse5Node,
  ).forEach(visit);
  return diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
}
