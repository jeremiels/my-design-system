import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { RovingFocusController } from "../../controllers/roving-focus.js";
import type { Orientation } from "../../types/common.js";
import { DSBaseElement } from "../base-element.js";
import { TabPanel } from "../tab-panel/tab-panel.js";
import { Tab } from "../tab/tab.js";
import tabsStyles from "./tabs.css" with { type: "css" };
import tabsTokens from "./tabs.tokens.css" with { type: "css" };

/** A unique `id` for a tab or a panel without one: they reference each other. */
let nextId = 0;

/**
 * Tabs: a list of `tab` and their `tab-panel`, one panel shown at a time.
 * `value` is the `value` of the selected tab, and of the panel it shows
 * (ADR 0020).
 *
 * Tab reaches the selected tab, then its panel. The arrow keys of the
 * orientation move to the next and previous enabled tabs and select them,
 * looping, along the text direction; Home and End select the first and last
 * tabs. A click selects a tab. Each selection by the user fires `change`.
 *
 * The tabs and the panels are children of the host: the tabs go in the
 * `tab` slot by themselves. The component links each tab and its panel with
 * `aria-controls` and `aria-labelledby`, and gives them an `id` if they have
 * none.
 *
 * @element u-tabs
 * @summary A list of tabs and the panel of the selected one.
 * @slot tab - The `tab` elements of the same registration. They go there by themselves.
 * @slot - The `tab-panel` elements of the same registration.
 * @csspart tablist - The list of tabs, `role="tablist"`.
 * @fires change - When the user selects another tab: a click, the arrow keys, Home or End.
 * @tokens tabs - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/tabs/`): `npm run analyze` documents them.
 */
export class Tabs extends DSBaseElement {
  static override componentName = "tabs";

  /** Recognizes its tabs and panels of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [Tab, TabPanel];

  static styles = [super.styles ?? [], tabsTokens, tabsStyles];

  /** The `value` of the selected tab. Without one, the first enabled tab. */
  @property({ type: String })
  value = "";

  /** The direction of the list of tabs: in a row, or one below the other. Reflected. */
  @property({ type: String, reflect: true })
  orientation: Orientation = "horizontal";

  /** An accessible name for the list of tabs, when the page has no heading for it. */
  @property({ type: String })
  label = "";

  constructor() {
    super();
    new RovingFocusController(this, {
      items: () => this.tabs,
      activeIndex: () => this.tabs.findIndex((tab) => tab.value === this.selectedValue),
      axis: () => (this.orientation === "vertical" ? "vertical" : "horizontal"),
      homeEnd: true,
      moved: (index) => this.#select(this.tabs[index]!),
      isDisabled: (tab) => (tab as Tab).disabled,
    });
    this.addEventListener("click", (event) => {
      const path = event.composedPath();
      const tab = this.tabs.find((candidate) => path.includes(candidate));
      if (tab && !tab.disabled) {
        tab.focus();
        this.#select(tab);
      }
    });
  }

  /** The tabs, in order. None on a server: the element has no children there. */
  protected get tabs(): readonly Tab[] {
    return Array.from(this.children ?? []).filter((child): child is Tab => child instanceof Tab);
  }

  /** The panels, in order. */
  protected get panels(): readonly TabPanel[] {
    return Array.from(this.children ?? []).filter(
      (child): child is TabPanel => child instanceof TabPanel,
    );
  }

  /** The `value` of the selected tab: `value`, or the first enabled tab's. */
  protected get selectedValue(): string {
    const tabs = this.tabs;
    const enabled = tabs.filter((tab) => !tab.disabled);
    return tabs.some((tab) => tab.value === this.value && !tab.disabled)
      ? this.value
      : (enabled[0]?.value ?? "");
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    const selected = this.selectedValue;
    for (const tab of this.tabs) {
      tab.id ||= `u-tab-${++nextId}`;
      tab.selected = tab.value === selected;
    }
    for (const panel of this.panels) {
      panel.id ||= `u-tab-panel-${++nextId}`;
      const tab = this.tabs.find((candidate) => candidate.value === panel.value);
      panel.hidden = panel.value !== selected;
      if (tab) {
        tab.setAttribute("aria-controls", panel.id);
        panel.setAttribute("aria-labelledby", tab.id);
      }
    }
  }

  /** Selects `tab` at the user's request: `change`, as a native radio. */
  #select(tab: Tab): void {
    if (tab.disabled || tab.value === this.selectedValue) {
      return;
    }
    this.value = tab.value;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  render() {
    return html`
      <div
        part="tablist"
        class="tablist"
        role="tablist"
        aria-orientation=${this.orientation}
        aria-label=${ifDefined(this.label || undefined)}
      >
        <slot name="tab" @slotchange=${() => this.requestUpdate()}></slot>
      </div>
      <slot @slotchange=${() => this.requestUpdate()}></slot>
    `;
  }
}
