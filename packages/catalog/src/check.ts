import { parseFragment } from "parse5";
import { checkCss, vueStyles } from "./css-check.ts";
import { closeIcons, findIcon } from "./icons.ts";
import { spellingSuggestion } from "./spelling.ts";
import { positionOf, scriptTemplates } from "./templates.ts";
import type {
  ComponentDoc,
  CssRule,
  DesignSystemDocs,
  Diagnostic,
  MarkupAttribute,
  MarkupElement,
  Rule,
  Suggestion,
} from "./model.ts";
import { usageRules } from "./usage-rules.ts";

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

/**
 * The suggestion of a likely name (ADR 0047), written where the checked text
 * has it: nothing without a name, or without a place to write it.
 */
function suggest(
  text: string | undefined,
  description: string,
  ranges: readonly { start: number; end: number }[],
): { suggestions: Suggestion[] } | Record<string, never> {
  return text === undefined || ranges.length === 0
    ? {}
    : {
        suggestions: [
          { description, edits: ranges.map(({ start, end }) => ({ start, end, text })) },
        ],
      };
}

/** A range of the checked text, as the start and the end of an edit. */
const at = (range: readonly [number, number] | undefined) =>
  range ? [{ start: range[0], end: range[1] }] : [];

/** ` Did you mean "x"?`, or nothing. */
const didYouMean = (name: string | undefined) => (name ? ` Did you mean "${name}"?` : "");

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
        const meant = spellingSuggestion(name, [
          ...component.attributes.map((member) => member.name),
          ...component.properties.map((member) => member.name),
        ]);
        report({
          severity: "error",
          message: `<${component.tag}> has no attribute nor property "${name}".${didYouMean(meant)}`,
          line: attribute.line,
          column: attribute.column,
          ...suggest(meant, `Replace with "${meant}"`, at(attribute.nameRange)),
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
        const meant = spellingSuggestion(attribute.value, values);
        report({
          severity: "error",
          message: `${attribute.name}="${attribute.value}" on <${component.tag}>: expected ${values.map((value) => `"${value}"`).join(", ")}.${didYouMean(meant)}`,
          line: attribute.line,
          column: attribute.column,
          ...suggest(meant, `Replace with "${meant}"`, at(attribute.valueRange)),
        });
      }
    }
  },
};

/**
 * Rule: an icon the set doesn't have, on the icon component (ADR 0044). The
 * component renders nothing for it, and warns only in the browser.
 */
export const unknownIcon: Rule = {
  id: "unknown-icon",
  description: "An icon name the design system's set doesn't have.",
  check(element, { docs, component, report }) {
    if (component.name !== "icon" || docs.icons.length === 0) {
      return;
    }
    for (const attribute of element.attributes) {
      if (attribute.name !== "name" || attribute.binding !== "attribute" || !attribute.value) {
        continue;
      }
      if (findIcon(docs, attribute.value)) {
        continue;
      }
      const close = closeIcons(docs, attribute.value);
      const meant = spellingSuggestion(
        attribute.value,
        docs.icons.map(({ name }) => name),
      );
      report({
        ...suggest(meant, `Replace with "${meant}"`, at(attribute.valueRange)),
        severity: "error",
        message: `name="${attribute.value}" on <${component.tag}>: ${docs.name} has no icon "${attribute.value}".${
          close.length > 0 ? ` Close: ${close.map(({ name }) => `"${name}"`).join(", ")}.` : ""
        }`,
        line: attribute.line,
        column: attribute.column,
      });
    }
  },
};

/**
 * Rule: the old name of a renamed icon, on the icon component (ADR 0049). It
 * still renders, as the alias of the new name; the fix writes the new name,
 * which renders the same icon: safe.
 */
export const deprecatedIcon: Rule = {
  id: "deprecated-icon",
  description: "The old name of a renamed icon: its new name renders the same icon.",
  check(element, { docs, component, report }) {
    if (component.name !== "icon") {
      return;
    }
    for (const attribute of element.attributes) {
      if (attribute.name !== "name" || attribute.binding !== "attribute") {
        continue;
      }
      const icon = docs.icons.find(({ aliases = [] }) =>
        aliases.some(({ name, deprecated }) => deprecated && name === attribute.value),
      );
      if (!icon) {
        continue;
      }
      report({
        severity: "warning",
        message: `name="${attribute.value}" on <${component.tag}>: the icon is renamed "${icon.name}".`,
        line: attribute.line,
        column: attribute.column,
        ...(attribute.valueRange
          ? {
              fix: {
                start: attribute.valueRange[0],
                end: attribute.valueRange[1],
                text: icon.name,
                safe: true,
              },
            }
          : {}),
      });
    }
  },
};

/** Rule: a listener of an event the component doesn't fire. */
export const unknownEvent: Rule = {
  id: "unknown-event",
  description: "A listener of an event no component of the design system fires.",
  check(element, { docs, component, report }) {
    for (const attribute of element.attributes) {
      if (attribute.binding !== "event") {
        continue;
      }
      // An event of another component of the design system bubbles to its
      // ancestors: `u-remove` of a tag, on its group.
      if (
        !DOM_EVENTS.has(attribute.name) &&
        !docs.components.some(({ events }) => events.some(({ name }) => name === attribute.name))
      ) {
        const meant = spellingSuggestion(
          attribute.name,
          component.events.map(({ name }) => name),
        );
        report({
          severity: "warning",
          message: `<${component.tag}> fires no "${attribute.name}" event.${didYouMean(meant)}`,
          line: attribute.line,
          column: attribute.column,
          ...suggest(meant, `Replace with "${meant}"`, at(attribute.nameRange)),
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
        const meant = spellingSuggestion(
          slot.value,
          component.slots.flatMap(({ name }) => (name ? [name] : [])),
        );
        report({
          severity: "warning",
          message: `<${component.tag}> has no slot "${slot.value}" for <${child.tag}>.${didYouMean(meant)}`,
          line: slot.line,
          column: slot.column,
          ...suggest(meant, `Replace with "${meant}"`, at(slot.valueRange)),
        });
      }
    }
  },
};

/**
 * The rules of `check`, by default: those of the API, then those the usage
 * rules of the DSDS documents turn on.
 */
export const defaultRules: readonly Rule[] = [
  unknownAttribute,
  invalidValue,
  unknownIcon,
  deprecatedIcon,
  unknownEvent,
  unknownSlot,
  ...usageRules,
];

// The few parse5 shapes this module reads.
interface Location {
  startLine: number;
  startCol: number;
  startOffset: number;
  endOffset: number;
  attrs?: Record<
    string,
    { startLine: number; startCol: number; startOffset: number; endOffset: number }
  >;
}
interface Parse5Node {
  nodeName: string;
  value?: string;
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Parse5Node[];
  content?: Parse5Node;
  sourceCodeLocation?: Location & { startTag?: Location; endTag?: Location };
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
  // A Vue directive, a Vue slot, a Lit element expression (`${ref(…)}`).
  if (raw.startsWith("v-") || raw.startsWith("#") || raw.startsWith("${")) {
    return at(raw, "directive");
  }
  // A Vue or Lit expression in a value: a binding, not a value to check.
  if (/\$\{|\{\{/.test(value)) {
    return at(raw, "property");
  }
  return at(raw, "attribute");
}

/** The elements of HTML that have no end tag. */
const VOID_ELEMENTS = new Set(
  "area base br col embed hr img input link meta source track wbr".split(" "),
);

/** A self-closing tag of Vue, `<acme-icon name="x" />`, with its attributes. */
const SELF_CLOSING =
  /<([A-Za-z][\w.-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/>/g;

/** An offset of checked markup, as an offset of its file; undefined for text the check added. */
type ToSource = (offset: number) => number | undefined;

/**
 * The template of a Vue single-file component, with the line it starts on.
 * Vue closes `<acme-icon />`; HTML doesn't, and would nest what follows in
 * it: the template gets end tags. `toSource` gives back the offsets of the
 * file, for a suggestion (ADR 0047): the added end tags have none.
 */
function vueTemplate(
  source: string,
): { markup: string; line: number; toSource: ToSource } | undefined {
  const match = /^<template(\s[^>]*)?>\r?\n?([\s\S]*)^<\/template>/m.exec(source);
  if (!match) {
    return undefined;
  }
  const contentStart = match.index + match[0].indexOf(match[2]!);
  /** Each rewritten tag: where it starts in both texts, its kept start, its two lengths. */
  const rewrites: { from: number; to: number; kept: number; length: number; written: number }[] =
    [];
  let delta = 0;
  const markup = match[2]!.replace(
    SELF_CLOSING,
    (tag, name: string, attributes: string, offset: number) => {
      if (VOID_ELEMENTS.has(name.toLowerCase())) {
        return tag;
      }
      const written = `<${name}${attributes}></${name}>`;
      rewrites.push({
        from: offset,
        to: offset + delta,
        kept: `<${name}${attributes}`.length,
        length: tag.length,
        written: written.length,
      });
      delta += written.length - tag.length;
      return written;
    },
  );
  const toSource: ToSource = (offset) => {
    let shift = 0;
    for (const rewrite of rewrites) {
      if (offset < rewrite.to) {
        break;
      }
      if (offset < rewrite.to + rewrite.written) {
        const inside = offset - rewrite.to;
        return inside < rewrite.kept ? contentStart + rewrite.from + inside : undefined;
      }
      shift += rewrite.written - rewrite.length;
    }
    return contentStart + offset - shift;
  };
  return { markup, line: source.slice(0, contentStart).split("\n").length, toSource };
}

/**
 * Where the name and the value of an attribute are in the file: `name` is the
 * bare name (`variant` of `:variant.prop`), the text runs from `start` to `end`.
 */
function rangesOf(
  markup: string,
  start: number,
  end: number,
  name: string,
  toSource: ToSource,
): { nameRange?: [number, number]; valueRange?: [number, number] } {
  const text = markup.slice(start, end);
  const equals = text.indexOf("=");
  const nameAt = (equals < 0 ? text : text.slice(0, equals))
    .toLowerCase()
    .indexOf(name.toLowerCase());
  const range = (from: number, to: number): [number, number] | undefined => {
    const a = toSource(start + from);
    const b = toSource(start + to - 1);
    return a === undefined || b === undefined ? undefined : [a, b + 1];
  };
  const nameRange = nameAt < 0 ? undefined : range(nameAt, nameAt + name.length);
  let valueRange: [number, number] | undefined;
  if (equals >= 0) {
    let from = equals + 1;
    while (/\s/.test(text[from] ?? "")) {
      from += 1;
    }
    const quoted = text[from] === '"' || text[from] === "'";
    const to = quoted ? text.length - 1 : text.length;
    valueRange = to > from + (quoted ? 1 : 0) ? range(quoted ? from + 1 : from, to) : undefined;
  }
  return { ...(nameRange ? { nameRange } : {}), ...(valueRange ? { valueRange } : {}) };
}

/** Options of `checkMarkup()`. */
export interface CheckOptions {
  /**
   * The file of the markup: a `.vue` file is checked in its `<template>` and
   * its `<style>` blocks, a `.css` file as CSS.
   */
  readonly file?: string;
  /** The rules: those of the docs by default. */
  readonly rules?: readonly Rule[];
  /** The rules on CSS: those of the docs by default (ADR 0043). */
  readonly cssRules?: readonly CssRule[];
}

/**
 * Checks the elements of the design system in HTML, or in the template of a
 * Vue component: an unknown tag, then the rules of the docs. Elements of
 * other prefixes aren't checked. The CSS of the file is checked too (ADR
 * 0043): its `style` attributes, the `<style>` blocks of a Vue component, a
 * whole `.css` file.
 */
export function checkMarkup(
  docs: DesignSystemDocs,
  source: string,
  options: CheckOptions = {},
): Diagnostic[] {
  const file = options.file;
  const cssOptions = {
    ...(file ? { file } : {}),
    ...(options.cssRules ? { rules: options.cssRules } : {}),
  };
  if (file?.endsWith(".css")) {
    return sorted(checkCss(docs, source, cssOptions));
  }
  // The `html` and `css` templates of a script (ADR 0048); a declaration file has none.
  if (file?.endsWith(".d.ts")) {
    return [];
  }
  if (file && SCRIPT.test(file)) {
    return sorted(
      scriptTemplates(source).flatMap(({ kind, text, offset }) => {
        const { line, column } = positionOf(source, offset);
        return kind === "css"
          ? checkCss(docs, text, { ...cssOptions, line, column, offset })
          : checkHtml(docs, text, options, { line, column, toSource: (at) => offset + at });
      }),
    );
  }
  const isVue = file?.endsWith(".vue") === true;
  const styles = isVue
    ? vueStyles(source).flatMap(({ css, line, offset }) =>
        checkCss(docs, css, { ...cssOptions, line, offset }),
      )
    : [];
  const vue = isVue ? vueTemplate(source) : undefined;
  if (isVue && !vue) {
    return sorted(styles);
  }
  return sorted([
    ...styles,
    ...checkHtml(
      docs,
      vue ? vue.markup : source,
      options,
      vue ? { line: vue.line, column: 1, toSource: vue.toSource } : HTML_FILE,
    ),
  ]);
}

/** The scripts whose Lit templates `check` reads: not a declaration file. */
const SCRIPT = /\.(?:[cm]?[jt]s|[jt]sx)$/;

/** Where markup is in its file: the line and the column of its first character, and its offsets. */
interface Region {
  readonly line: number;
  readonly column: number;
  readonly toSource: ToSource;
}

/** A whole HTML file. */
const HTML_FILE: Region = { line: 1, column: 1, toSource: (offset) => offset };

/** Checks markup that starts at `region` of its file: an HTML file, a Vue template, a Lit template. */
function checkHtml(
  docs: DesignSystemDocs,
  markup: string,
  options: CheckOptions,
  region: Region,
): Diagnostic[] {
  const file = options.file;
  const cssOptions = {
    ...(file ? { file } : {}),
    ...(options.cssRules ? { rules: options.cssRules } : {}),
  };
  const { toSource } = region;
  // A position of the markup, as a position of the file: its first line
  // starts at the column of the region.
  const position = (line: number, column: number) => ({
    line: line + region.line - 1,
    column: line === 1 ? column + region.column - 1 : column,
  });
  const rules = options.rules ?? docs.rules;
  const byTag = new Map(docs.components.map((component) => [component.tag, component]));
  const diagnostics: Diagnostic[] = [];

  /** The elements under `node`, with their children. */
  const elementsOf = (node: Parse5Node): MarkupElement[] => {
    const nested = [...(node.childNodes ?? []), ...(node.content ? [node.content] : [])];
    if (!node.tagName) {
      return nested.flatMap(elementsOf);
    }
    const location = node.sourceCodeLocation;
    const tagLocation = location?.startTag ?? location;
    const { line, column } = position(location?.startLine ?? 1, location?.startCol ?? 1);
    // The tag name, in the start tag and in the end tag the file has.
    const tagRanges = [location?.startTag, location?.endTag].flatMap((tag, index) => {
      const from = tag && toSource(tag.startOffset + (index === 0 ? 1 : 2));
      return from === undefined ? [] : [[from, from + node.tagName!.length] as const];
    });
    return [
      {
        tag: node.tagName,
        line,
        column,
        ...(tagRanges.length > 0 ? { tagRanges } : {}),
        attributes: (node.attrs ?? []).map(({ name, value }) => {
          const at = tagLocation?.attrs?.[name];
          const where = at ? position(at.startLine, at.startCol) : { line, column };
          const attribute = attributeOf(name, value, where.line, where.column);
          return at
            ? {
                ...attribute,
                ...rangesOf(markup, at.startOffset, at.endOffset, attribute.name, toSource),
              }
            : attribute;
        }),
        text: (node.childNodes ?? [])
          .filter(({ nodeName }) => nodeName === "#text")
          .map(({ value }) => value ?? "")
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
        // A `<template>` of Vue or Lit holds its elements in `content`.
        children: nested.flatMap(elementsOf),
      },
    ];
  };

  // The text style classes (ADR 0051): `u-text-heading-xl`. A class under
  // `<prefix>-text-` names one, as a tag under `<prefix>-` names a component.
  const textStyles = new Set(
    docs.tokens.flatMap(({ className }) => (className ? [className] : [])),
  );
  const textPrefix = `${docs.prefix}-text-`;
  const checkClasses = (element: MarkupElement) => {
    for (const { name, value, binding, line, column, valueRange } of element.attributes) {
      if (name !== "class" || binding !== "attribute" || textStyles.size === 0) {
        continue;
      }
      for (const { 0: className, index } of value.matchAll(/\S+/g)) {
        if (!className.startsWith(textPrefix) || textStyles.has(className)) {
          continue;
        }
        const meant = spellingSuggestion(className, textStyles);
        diagnostics.push({
          rule: "unknown-text-style",
          severity: "error",
          message: `${docs.name} has no text style "${className}": the class sets nothing.${meant ? ` Did you mean "${meant}"?` : ""}`,
          ...(file ? { file } : {}),
          line,
          column,
          ...suggest(
            meant,
            `Replace with ${meant}`,
            valueRange
              ? [{ start: valueRange[0] + index, end: valueRange[0] + index + className.length }]
              : [],
          ),
        });
      }
    }
  };

  const visit = (element: MarkupElement, ancestors: readonly MarkupElement[]) => {
    checkClasses(element);
    // Any element's `style`: the tokens it reads, the raw values it holds.
    for (const { name, value, binding, line, column } of element.attributes) {
      if (name === "style" && binding === "attribute" && value.trim()) {
        diagnostics.push(...checkCss(docs, value, { ...cssOptions, at: { line, column } }));
      }
    }
    if (element.tag.startsWith(`${docs.prefix}-`)) {
      const component = byTag.get(element.tag);
      if (!component) {
        const meant = spellingSuggestion(element.tag, byTag.keys());
        diagnostics.push({
          rule: "unknown-element",
          severity: "error",
          message: `${docs.name} has no <${element.tag}>.${meant ? ` Did you mean <${meant}>?` : ""}`,
          ...(file ? { file } : {}),
          line: element.line,
          column: element.column,
          ...suggest(
            meant,
            `Replace with <${meant}>`,
            (element.tagRanges ?? []).map(([start, end]) => ({ start, end })),
          ),
        });
      } else {
        for (const rule of rules) {
          rule.check(element, {
            docs,
            component,
            ancestors,
            report: (diagnostic) =>
              diagnostics.push({ ...diagnostic, rule: rule.id, ...(file ? { file } : {}) }),
          });
        }
      }
    }
    for (const child of element.children) {
      visit(child, [element, ...ancestors]);
    }
  };
  for (const element of elementsOf(
    parseFragment(markup, { sourceCodeLocationInfo: true }) as unknown as Parse5Node,
  )) {
    visit(element, []);
  }
  return diagnostics;
}

/** Diagnostics in the order of the file. */
const sorted = (diagnostics: Diagnostic[]) =>
  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
