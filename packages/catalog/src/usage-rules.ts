// The rules of `check` that the usage rules of the DSDS documents turn on
// (ADR 0040). A rule here checks nothing by itself: a guideline of a
// component names it in its `checks` (`role: lint-rule`), and gives its
// options. The diagnostic quotes the guideline.
import type {
  ComponentDoc,
  DesignSystemDocs,
  Guideline,
  MarkupElement,
  Rule,
  RuleContext,
} from "./model.ts";

/** The elements of HTML: a parent or a child `check` knows. Any other tag may be a Vue component. */
const HTML_ELEMENTS = new Set(
  (
    "a abbr address area article aside audio b bdi bdo blockquote body br button canvas caption " +
    "cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset " +
    "figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input " +
    "ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup " +
    "option output p picture pre progress q rp rt ruby s samp script search section select slot " +
    "small source span strong style sub summary sup table tbody td template textarea tfoot th " +
    "thead time title tr track u ul var video wbr svg math"
  ).split(" "),
);

/** A name compared without case nor dashes: `close-label` and `closeLabel` match. */
const loose = (name: string) => name.toLowerCase().replaceAll("-", "");

/** An option of a rule, as a list of strings: `attributes: [label]`, or `attributes: label`. */
function strings(options: Readonly<Record<string, unknown>>, key: string): string[] {
  const value = options[key];
  if (typeof value === "string") {
    return [value];
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** The tags an option names: its `elements`, and the tags of its `components` in `docs`. */
function tagsOf(docs: DesignSystemDocs, options: Readonly<Record<string, unknown>>): string[] {
  const tags = strings(options, "components").flatMap((name) => {
    const component = docs.components.find((candidate) => candidate.name === name);
    return component ? [component.tag] : [];
  });
  return [...strings(options, "elements"), ...tags];
}

/** `<a>`, `<b>` or `<c>`. */
const either = (tags: readonly string[]) =>
  tags
    .map((tag) => `<${tag}>`)
    .join(", ")
    .replace(/, ([^,]*)$/, " or $1");

/** Whether `check` knows what `tag` is: an element of HTML, or of the design system. */
const known = (tag: string, docs: DesignSystemDocs) =>
  HTML_ELEMENTS.has(tag) || tag.startsWith(`${docs.prefix}-`);

/** Whether a directive hides what the element holds: `v-bind="attrs"`, `v-html`, `v-text`. */
const opaque = (element: MarkupElement, names: readonly string[]) =>
  element.attributes.some(({ name, binding }) => binding === "directive" && names.includes(name));

/** Whether the element sets one of `names`, an attribute or its property, to something. */
function sets(element: MarkupElement, component: ComponentDoc, names: readonly string[]): boolean {
  const keys = new Set(
    names.flatMap((name) => {
      const member = component.attributes.find((candidate) => candidate.name === name);
      return [loose(name), ...(member?.property ? [loose(member.property)] : [])];
    }),
  );
  return element.attributes.some(
    ({ name, value, binding }) =>
      binding !== "event" &&
      binding !== "directive" &&
      keys.has(loose(name)) &&
      (binding !== "attribute" || value.trim() !== ""),
  );
}

/** Whether the element shows text, its own or that of its children in the default slot. */
function hasText(element: MarkupElement): boolean {
  return (
    element.text !== "" ||
    opaque(element, ["v-html", "v-text"]) ||
    element.children.some(
      (child) => !child.attributes.some(({ name }) => name === "slot") && hasText(child),
    )
  );
}

/** The children of an element in the DOM: those of a `<template>` take its place. */
const childrenOf = (element: MarkupElement): MarkupElement[] =>
  element.children.flatMap((child) => (child.tag === "template" ? childrenOf(child) : [child]));

/** An error for a `must` or a `must-not`, a warning for a `should` or a `should-not`. */
const severityOf = ({ level }: Guideline) =>
  level === "must" || level === "must-not" ? ("error" as const) : ("warning" as const);

/** A problem a usage rule finds: its message, and the element it is on. */
interface Finding {
  readonly message: string;
  readonly at?: MarkupElement;
}

/**
 * A rule that the guidelines naming `id` turn on, with their options. An
 * error for a `must` or a `must-not`, a warning for a `should` or a
 * `should-not`. The diagnostic quotes the guideline.
 */
function usageRule(
  id: string,
  description: string,
  find: (
    element: MarkupElement,
    context: RuleContext,
    options: Readonly<Record<string, unknown>>,
  ) => Finding[],
): Rule {
  return {
    id,
    description,
    check(element, context) {
      for (const guideline of context.component.guidelines) {
        if (guideline.check?.rule !== id || guideline.level === "may") {
          continue;
        }
        for (const { message, at = element } of find(element, context, guideline.check.options)) {
          context.report({
            severity: severityOf(guideline),
            message,
            guideline: guideline.statement,
            line: at.line,
            column: at.column,
          });
        }
      }
    },
  };
}

/**
 * Rule: the component needs one of `attributes`, set to something. The
 * label of a field, of a modal, of a table.
 */
export const requiredAttribute: Rule = usageRule(
  "required-attribute",
  "An attribute the component needs: its label, for instance.",
  (element, { component }, options) => {
    const attributes = strings(options, "attributes");
    if (
      attributes.length === 0 ||
      opaque(element, ["v-bind"]) ||
      sets(element, component, attributes)
    ) {
      return [];
    }
    return [
      {
        message: `<${component.tag}> needs ${attributes.map((name) => `"${name}"`).join(" or ")}.`,
      },
    ];
  },
);

/**
 * Rule: the component needs a name, its text or one of `attributes`. A
 * button that shows only an icon is named by `label`.
 */
export const accessibleName: Rule = usageRule(
  "accessible-name",
  "A component without a name: no text, nor the attribute that names it.",
  (element, { component }, options) => {
    const attributes = strings(options, "attributes");
    if (
      hasText(element) ||
      opaque(element, ["v-bind"]) ||
      (attributes.length > 0 && sets(element, component, attributes))
    ) {
      return [];
    }
    const instead =
      attributes.length > 0
        ? `: give it a text, or ${attributes.map((n) => `"${n}"`).join(" or ")}`
        : "";
    return [{ message: `<${component.tag}> has no name${instead}.` }];
  },
);

/**
 * Rule: the component is a child of one of `components`, directly. A
 * `<template>` around it doesn't count, nor does it at the top of the
 * markup, or in an element `check` doesn't know: a Vue component may put
 * it in its place.
 */
export const requiredParent: Rule = usageRule(
  "required-parent",
  "A component outside the component it belongs in: a radio outside its group.",
  (_element, { docs, component, ancestors }, options) => {
    const parents = tagsOf(docs, options);
    const parent = ancestors.find(({ tag }) => tag !== "template");
    if (
      parents.length === 0 ||
      !parent ||
      parents.includes(parent.tag) ||
      !known(parent.tag, docs)
    ) {
      return [];
    }
    return [
      {
        message: `<${component.tag}> goes directly in ${either(parents)}, not in <${parent.tag}>.`,
      },
    ];
  },
);

/**
 * Rule: the component isn't inside one of `elements` or `components`. A
 * button in a link, a component that renders its own `<button>` in a
 * `<button>`.
 */
export const forbiddenAncestor: Rule = usageRule(
  "forbidden-ancestor",
  "A component inside an element it doesn't go in: a button in a link.",
  (_element, { docs, component, ancestors }, options) => {
    const forbidden = tagsOf(docs, options);
    const ancestor = ancestors.find(({ tag }) => forbidden.includes(tag));
    return ancestor ? [{ message: `<${component.tag}> doesn't go inside <${ancestor.tag}>.` }] : [];
  },
);

/**
 * Rule: the children of the component in its default slot are one of
 * `elements` or `components`. The trigger of a tooltip, the tags of a
 * group. A child `check` doesn't know, a Vue component, is left alone.
 */
export const allowedChildren: Rule = usageRule(
  "allowed-children",
  "A child the component doesn't take in its default slot.",
  (element, { docs, component }, options) => {
    const allowed = tagsOf(docs, options);
    if (allowed.length === 0) {
      return [];
    }
    return childrenOf(element)
      .filter(
        (child) =>
          !child.attributes.some(({ name }) => name === "slot") &&
          known(child.tag, docs) &&
          !allowed.includes(child.tag),
      )
      .map((child) => ({
        message: `<${child.tag}> doesn't go in <${component.tag}>: it takes ${either(allowed)}.`,
        at: child,
      }));
  },
);

/** The rules that usage rules turn on. */
export const usageRules: readonly Rule[] = [
  requiredAttribute,
  accessibleName,
  requiredParent,
  forbiddenAncestor,
  allowedChildren,
];
