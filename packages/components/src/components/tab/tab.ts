import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../../bases/base-element.js";
import tabStyles from "./tab.css" with { type: "css" };
import tabTokens from "./tab.tokens.css" with { type: "css" };

/**
 * A tab: one of the tabs of a `tabs`, which shows its panel, the
 * `tab-panel` of the same `value`. Its `tabs` selects it and gives it the
 * focus: a tab has no use outside a `tabs` (ADR 0020).
 *
 * The host has `role="tab"`, `aria-selected` and `aria-controls`, and goes
 * in the `tab` slot of its `tabs`: its content is its accessible name.
 *
 * @element u-tab
 * @summary A tab of a tabs component.
 * @slot - The label of the tab.
 * @tokens tab - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/tab/`): `npm run analyze` documents them.
 */
export class Tab extends withDisabled(DSBaseElement) {
  static override componentName = "tab";

  static styles = [super.styles ?? [], tabTokens, tabStyles];

  /** The `value` of the `tab-panel` it shows, and of its `tabs` while it is selected. */
  @property({ type: String })
  value = "";

  /** Whether the tab is selected. Set by its `tabs`, from the `value` of the `tabs`. Reflected. */
  @property({ type: Boolean, reflect: true })
  selected = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "tab");
    }
    if (!this.hasAttribute("slot")) {
      this.setAttribute("slot", "tab");
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    this.setAttribute("aria-selected", this.selected ? "true" : "false");
    if (changedProperties.has("disabled") || changedProperties.has("value")) {
      // Its tabs computes its tabindex and its panels from its tabs.
      (this.parentElement as { requestUpdate?: () => void } | null)?.requestUpdate?.();
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}
