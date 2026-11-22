/**
 * The documentation of a design system, as its tools consult it (ADR 0039):
 * its components, their API from the Custom Elements Manifest, and their
 * usage rules from the DSDS documents. Plain data: a CLI prints it, an MCP
 * server returns it, a test reads it.
 */

/** An attribute, a property, an event, a slot, a part, a token or a method of a component. */
export interface Member {
  readonly name: string;
  /** Its type, as the manifest writes it: `"small" | "medium" | "large"`. */
  readonly type?: string;
  readonly description?: string;
  /** Its default value, as code: `"medium"`, `false`. */
  readonly default?: string;
  /** The attribute of a property, or the property of an attribute. */
  readonly attribute?: string;
  readonly property?: string;
  /** The values of a union of strings, for an attribute or a property. */
  readonly values?: readonly string[];
}

/** How strongly a rule applies, from DSDS. */
export type GuidelineLevel = "must" | "should" | "may" | "should-not" | "must-not";

/** A usage rule of a component, from its DSDS document. */
export interface Guideline {
  readonly level: GuidelineLevel;
  readonly statement: string;
  /** The title of its section: « Accessibilité ». */
  readonly section?: string;
  /** Whether the rule says when to use the component, or how. */
  readonly framing: "when-to-use" | "how-to-use";
  /** Who reads it: people, agents, or both. */
  readonly audience: "all" | "human" | "agent";
  /**
   * Who applies it: the users of the components, or the contributors who
   * write them. A design system's view leaves out its base's contributor
   * rules (`$extensions: { dev.unicorne: { audience: contributors } }`).
   */
  readonly scope: "users" | "contributors";
  /** The components to use instead, by name. */
  readonly alternatives: readonly string[];
  /** How the rule is checked: `automated`, `manual`. */
  readonly checkedBy?: string;
}

/** A component of a design system. */
export interface ComponentDoc {
  /** Its name, without prefix: `button`. */
  readonly name: string;
  /** Its tag, with the prefix of the design system: `acme-button`. */
  readonly tag: string;
  /** The name of its class: `Button`. */
  readonly className: string;
  readonly summary: string;
  readonly description: string;
  /** What it is, in a sentence, from its DSDS document. */
  readonly usage?: string;
  readonly attributes: readonly Member[];
  /** The properties without an attribute: rich values, set from script. */
  readonly properties: readonly Member[];
  readonly events: readonly Member[];
  readonly slots: readonly Member[];
  readonly parts: readonly Member[];
  /** Its CSS custom properties: `--acme-card-padding`. */
  readonly tokens: readonly Member[];
  readonly methods: readonly Member[];
  readonly guidelines: readonly Guideline[];
}

/** A problem `check` finds in markup. */
export interface Diagnostic {
  /** The rule that found it: `unknown-attribute`. */
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly file?: string;
  readonly line: number;
  readonly column: number;
}

/** An attribute of an element in checked markup, with the binding it was written with. */
export interface MarkupAttribute {
  /** The name, without its binding: `variant` for `:variant`, `u-sort` for `@u-sort`. */
  readonly name: string;
  readonly value: string;
  /**
   * `attribute` for `variant="plain"`, `boolean` for Lit's `?disabled`,
   * `property` for Vue's `:variant` or Lit's `.variant`, `event` for `@click`,
   * `directive` for the others (`v-if`, `ref`).
   */
  readonly binding: "attribute" | "boolean" | "property" | "event" | "directive";
  readonly line: number;
  readonly column: number;
}

/** An element of checked markup. */
export interface MarkupElement {
  readonly tag: string;
  readonly attributes: readonly MarkupAttribute[];
  readonly line: number;
  readonly column: number;
  /** Its child elements. */
  readonly children: readonly MarkupElement[];
}

/** What a rule receives for an element of a component of the design system. */
export interface RuleContext {
  readonly docs: DesignSystemDocs;
  /** The component of the element. */
  readonly component: ComponentDoc;
  report(diagnostic: Omit<Diagnostic, "rule" | "file">): void;
}

/** A rule of `check`. A design system adds its own, or leaves out those of its base by `id`. */
export interface Rule {
  readonly id: string;
  /** What it checks, in a sentence. */
  readonly description: string;
  check(element: MarkupElement, context: RuleContext): void;
}

/** Text a design system's view leaves out: a pattern to remove, or a rewrite. */
export type Internal = RegExp | ((text: string) => string);

/** The documentation of a design system. */
export interface DesignSystemDocs {
  /** Its name: `ACME`. */
  readonly name: string;
  /** The prefix of its tags: `acme`. */
  readonly prefix: string;
  /** The package an application imports it from: `@acme/design-system`. */
  readonly package: string;
  readonly description: string;
  readonly components: readonly ComponentDoc[];
  /** The rules of `check`. */
  readonly rules: readonly Rule[];
  /** The code that registers a component in an application. */
  importCode(component: ComponentDoc): string;
  /**
   * Text the view of a design system built on these docs leaves out:
   * references to records of this one only, like its ADRs. A pattern
   * removes what it matches, a function rewrites the text.
   */
  readonly internal: readonly Internal[];
}
