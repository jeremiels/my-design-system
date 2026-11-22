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
  /** The rule of `check` that verifies it in markup, if any. */
  readonly check?: GuidelineCheck;
}

/**
 * The rule of `check` a usage rule turns on, from its DSDS document: a
 * `checks` pointer with `role: lint-rule`, whose fragment names the rule
 * (`npm:@unicorne/catalog#required-attribute`), and its options, under
 * `$extensions: { dev.unicorne: { check: … } }`.
 */
export interface GuidelineCheck {
  /** The `id` of the rule: `required-attribute`. */
  readonly rule: string;
  /** What the rule checks for this component: `{ attributes: ["label"] }`. */
  readonly options: Readonly<Record<string, unknown>>;
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

/** The level of a token: a raw value, an intent, or a setting of one component. */
export type TokenLevel = "primitive" | "semantic" | "component";

/** The value of a token in one context of a modifier. */
export interface TokenValue {
  /** As CSS, aliases resolved: `#9cc6ff`. */
  readonly value: string;
  /** The tokens it aliases, nearest first, by ID. */
  readonly aliasChain: readonly string[];
}

/** A pairing rule of a token (DSDS `combos`, ADR 0046): the tokens it goes with, or never with. */
export interface TokenCombo {
  /** `must` and `should` allow the items; `must-not` and `should-not` deny them. */
  readonly level: GuidelineLevel;
  /** Token IDs: `color.surface.default`. */
  readonly items: readonly string[];
  /** Why: the contrast measured on them. */
  readonly note?: string;
}

/** A design token, from the token manifest of a design system (ADR 0042). */
export interface TokenDoc extends TokenValue {
  /** Its ID: `color.action.background`. */
  readonly id: string;
  /** Its custom property: `--u-color-action-background`. */
  readonly name: string;
  readonly level: TokenLevel;
  /** Its DTCG type: `color`, `dimension`, `duration`. */
  readonly type: string;
  /** Its ID without the last segment: `color.action`. */
  readonly group: string;
  /** What to use it for: its own description, or its group's. */
  readonly description?: string;
  /**
   * Its value in each context that changes it, by `<modifier>:<context>`:
   * `theme:dark`, `motion:reduced`, `button-variant:danger`.
   */
  readonly contexts: Readonly<Record<string, TokenValue>>;
  /** How to use it, from its DSDS entry (ADR 0046). */
  readonly usage?: string;
  /** Its usage rules, from its DSDS entry. */
  readonly guidelines?: readonly Guideline[];
  /** The tokens it goes with, or never with, from its DSDS entry. */
  readonly combos?: readonly TokenCombo[];
  /**
   * A text style's parts (ADR 0051): CSS property → the token it aliases,
   * `{ "font-size": "font.size.2xl" }`. Its `value` is the `font` shorthand.
   */
  readonly parts?: Readonly<Record<string, string>>;
  /** A text style's class in the page sheet: `u-text-heading-xl`. */
  readonly className?: string;
}

/** The usage of a group of tokens, from its DSDS entry (ADR 0050): `spacing`, `font`. */
export interface TokenGroupDoc {
  /** The start of its tokens' IDs: `spacing` for `spacing.md`. */
  readonly name: string;
  readonly description?: string;
  /** Its rules, for every token of the group. */
  readonly guidelines: readonly Guideline[];
}

/** A modifier of the tokens: `theme`, its default `light` and its contexts. */
export interface TokenModifier {
  readonly name: string;
  readonly default?: string;
  readonly contexts: readonly string[];
}

/** An icon of the design system's set, from its icon manifest (ADR 0044). */
export interface IconDoc {
  /** Its name, the `name` of the icon component: `close`. */
  readonly name: string;
  /** What it means, or where it goes. */
  readonly description?: string;
  /** The words people search it by: `cross`, `dismiss`. */
  readonly tags: readonly string[];
  /** Its families: `navigation`, `status`. */
  readonly categories: readonly string[];
  /** Its other names; a deprecated one is an old name of a renamed icon (ADR 0049). */
  readonly aliases?: readonly { readonly name: string; readonly deprecated?: boolean }[];
}

/** A problem `check` finds in markup. */
export interface Diagnostic {
  /** The rule that found it: `unknown-attribute`. */
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  /** The usage rule it breaks, from the DSDS documents, for a rule that checks one. */
  readonly guideline?: string;
  readonly file?: string;
  readonly line: number;
  readonly column: number;
  /** The change that fixes it, when one token or one name fits (ADR 0045). */
  readonly fix?: Fix;
  /**
   * What it likely meant, never applied by a fix: an editor or an agent
   * chooses (ADR 0047).
   */
  readonly suggestions?: readonly Suggestion[];
}

/** A change of the checked text: the characters from `start` to `end` become `text`. */
export interface Edit {
  /** Offsets in the checked text: the first character replaced, and the one after the last. */
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** A change a person or an agent may apply: a typo's likely name (ADR 0047). */
export interface Suggestion {
  /** What it does: `Replace with "primary"`. */
  readonly description: string;
  /** Its changes, applied together: the start tag and the end tag of an element. */
  readonly edits: readonly Edit[];
}

/**
 * A change of the checked text that fixes a problem (ADR 0045): replace the
 * characters from `start` to `end` with `text`. A safe fix keeps what the
 * page shows in every theme; an unsafe one changes it, as the rule intends,
 * and needs a review.
 */
export interface Fix extends Edit {
  readonly safe: boolean;
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
  /** Where its name and its value are in the checked text, for a suggestion (ADR 0047). */
  readonly nameRange?: readonly [number, number];
  readonly valueRange?: readonly [number, number];
}

/** An element of checked markup. */
export interface MarkupElement {
  readonly tag: string;
  readonly attributes: readonly MarkupAttribute[];
  readonly line: number;
  readonly column: number;
  /** Its own text, without that of its children, trimmed: `{{ count }} results`. */
  readonly text: string;
  /** Its child elements. */
  readonly children: readonly MarkupElement[];
  /** Where its tag name is in the checked text: in its start tag, and in its end tag. */
  readonly tagRanges?: readonly (readonly [number, number])[];
}

/** What a rule receives for an element of a component of the design system. */
export interface RuleContext {
  readonly docs: DesignSystemDocs;
  /** The component of the element. */
  readonly component: ComponentDoc;
  /** The elements around the element, its parent first. */
  readonly ancestors: readonly MarkupElement[];
  report(diagnostic: Omit<Diagnostic, "rule" | "file">): void;
}

/** A rule of `check`. A design system adds its own, or leaves out those of its base by `id`. */
export interface Rule {
  readonly id: string;
  /** What it checks, in a sentence. */
  readonly description: string;
  check(element: MarkupElement, context: RuleContext): void;
}

/** A declaration of checked CSS: `padding: 16px 24px`. */
export interface CssDeclaration {
  /** In lowercase: `padding`, `--app-gap`. */
  readonly property: string;
  readonly value: string;
  readonly line: number;
  readonly column: number;
  /**
   * The offset of `value` in the checked text, for a fix. Undefined when the
   * value can't be fixed in place: a `style` attribute, a value with a comment.
   */
  readonly valueStart?: number;
  /** The declarations of the same block, itself included: a color and its background (ADR 0046). */
  readonly siblings?: readonly { readonly property: string; readonly value: string }[];
}

/** What a CSS rule receives. */
export interface CssRuleContext {
  readonly docs: DesignSystemDocs;
  report(diagnostic: Omit<Diagnostic, "rule" | "file">): void;
}

/**
 * A rule of `check` on CSS (ADR 0043): a style sheet, a `<style>` of a Vue
 * component, a `style` attribute. A design system adds its own, or leaves out
 * those of its base by `id`, like a rule on markup.
 */
export interface CssRule {
  readonly id: string;
  /** What it checks, in a sentence. */
  readonly description: string;
  check(declaration: CssDeclaration, context: CssRuleContext): void;
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
  /** Its tokens, in the order of their files: primitives, semantic tokens, then component tokens. */
  readonly tokens: readonly TokenDoc[];
  /** The modifiers whose contexts change the tokens. */
  readonly tokenModifiers: readonly TokenModifier[];
  /** The usage of its groups of tokens, with the rules of each (ADR 0050). */
  readonly tokenGroups: readonly TokenGroupDoc[];
  /** The icons of its set, by name: the base's, then its own (ADR 0044). */
  readonly icons: readonly IconDoc[];
  /** The rules of `check`. */
  readonly rules: readonly Rule[];
  /** The rules of `check` on CSS: the use of the tokens (ADR 0043). */
  readonly cssRules: readonly CssRule[];
  /** The code that registers a component in an application. */
  importCode(component: ComponentDoc): string;
  /**
   * Text the view of a design system built on these docs leaves out:
   * references to records of this one only, like its ADRs. A pattern
   * removes what it matches, a function rewrites the text.
   */
  readonly internal: readonly Internal[];
}
