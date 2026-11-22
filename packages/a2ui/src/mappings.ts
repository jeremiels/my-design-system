/**
 * The mappings between the A2UI components of a design system and its
 * components (ADR 0052): what the documentation of a component doesn't say.
 * Plain data, without any import: the generator of the A2UI catalog reads
 * them in Node, and the adapters in the browser.
 */

/** An A2UI component that renders a component of the design system. */
export interface ComponentMapping {
  /** The component it renders, by name: `"text-field"`. */
  readonly component: string;
  /**
   * The attributes an agent sets, by attribute name. The documentation gives
   * their type, their values, their default and their description; the A2UI
   * component names them by property: `error-message` → `errorMessage`.
   */
  readonly attributes?: readonly string[];
  /** The attributes among them that take the name of an icon: an `enum` of the design system's icons. */
  readonly icons?: readonly string[];
  /** The A2UI property whose text fills the default slot: `"text"`. */
  readonly text?: string;
  /** The A2UI property whose components fill the default slot: one (`child`) or a list (`children`). */
  readonly children?: "child" | "children";
  /**
   * The property the component writes the user's input to, and the event
   * that says it changed. The agent binds it to a path of the data model.
   */
  readonly value?: { readonly property: string; readonly event: string };
  /**
   * Options the agent gives as data, `{ value, label }`, under the A2UI
   * property `options`. The adapter sets them as a property of the component
   * (`{ property: "options" }`), or renders a child component for each, of the
   * same registration (`{ component: "radio" }`).
   */
  readonly options?: { readonly property: string } | { readonly component: string };
  /** The event that sends the A2UI action of the component: `"click"`. */
  readonly action?: string;
}

/**
 * An A2UI component the design system has no component for: a container
 * without a look of its own, its children side by side (`row`) or one below
 * the other (`column`), or plain text in a text style (`text`).
 */
export interface OwnMapping {
  readonly kind: "row" | "column" | "text";
}

export type A2uiMapping = ComponentMapping | OwnMapping;

/** The mappings of a design system, by A2UI component name: `TextField`. */
export type A2uiMappings = Readonly<Record<string, A2uiMapping>>;

/** Mappings to add, or to replace by A2UI name. `null` removes one of the base: `{ Badge: null }`. */
export type A2uiMappingLayer = Readonly<Record<string, A2uiMapping | null>>;

/** Whether a mapping renders a component of the design system. */
export const isComponentMapping = (mapping: A2uiMapping): mapping is ComponentMapping =>
  "component" in mapping;

/** The base's mappings, with a design system's layer over them. */
export function mergeMappings(base: A2uiMappings, layer: A2uiMappingLayer = {}): A2uiMappings {
  return Object.fromEntries(
    Object.entries({ ...base, ...layer }).filter(
      (entry): entry is [string, A2uiMapping] => entry[1] !== null,
    ),
  );
}

const FIELD = ["label", "hint", "required", "disabled", "error-message"] as const;

/**
 * The base's mappings. A design system offers those whose component is in
 * its catalog; the generator leaves out the others.
 */
export const socleMappings: A2uiMappings = {
  Column: { kind: "column" },
  Row: { kind: "row" },
  Text: { kind: "text" },
  Button: {
    component: "button",
    attributes: ["variant", "appearance", "size", "disabled"],
    text: "text",
    action: "click",
  },
  Alert: { component: "alert", attributes: ["variant"], text: "text" },
  Badge: { component: "badge", attributes: ["variant"], text: "text" },
  Icon: { component: "icon", attributes: ["name", "label"], icons: ["name"] },
  TextField: {
    component: "text-field",
    attributes: ["type", ...FIELD],
    value: { property: "value", event: "input" },
  },
  Textarea: {
    component: "textarea",
    attributes: ["rows", ...FIELD],
    value: { property: "value", event: "input" },
  },
  Checkbox: {
    component: "checkbox",
    attributes: FIELD,
    value: { property: "checked", event: "change" },
  },
  Switch: {
    component: "switch",
    attributes: ["label", "hint", "disabled"],
    value: { property: "checked", event: "change" },
  },
  Select: {
    component: "select",
    attributes: ["placeholder", ...FIELD],
    value: { property: "value", event: "change" },
    options: { property: "options" },
  },
  RadioGroup: {
    component: "radio-group",
    attributes: ["orientation", ...FIELD],
    value: { property: "value", event: "change" },
    options: { component: "radio" },
  },
};
