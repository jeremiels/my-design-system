import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import tabPanelStyles from "./tab-panel.css" with { type: "css" };

/**
 * A tab panel: the content a `tab` of the same `value` shows, in a `tabs`.
 * Its `tabs` hides it while its tab isn't selected (ADR 0020).
 *
 * The host has `role="tabpanel"` and `aria-labelledby` its tab. It takes the
 * focus after the tab list, as the ARIA pattern asks: Tab reaches the
 * panel, then its content.
 *
 * @element u-tab-panel
 * @summary A panel of a tabs component.
 * @slot - The content of the panel.
 */
export class TabPanel extends DSBaseElement {
  static override componentName = "tab-panel";

  static styles = [super.styles ?? [], tabPanelStyles];

  /** The `value` of the `tab` that shows it. */
  @property({ type: String })
  value = "";

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "tabpanel");
    }
    if (!this.hasAttribute("tabindex")) {
      this.tabIndex = 0;
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}
