import { html } from "lit";
import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../base-element.js";
import menuItemStyles from "./menu-item.css" with { type: "css" };

/**
 * An item of a `menu`: an action. The host has `role="menuitem"`; its
 * content is its accessible name. Its menu gives it the focus, and a click
 * or Enter or Space on it fires its `click`, then closes the menu
 * (ADR 0021).
 *
 * @element u-menu-item
 * @summary An action of a menu.
 * @slot - The label of the item.
 */
export class MenuItem extends withDisabled(DSBaseElement) {
  static override componentName = "menu-item";

  static styles = [super.styles ?? [], menuItemStyles];

  /** A value the application reads in the item's `click`, to tell the items apart. */
  @property({ type: String })
  value = "";

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "menuitem");
    }
  }

  render() {
    return html`<slot></slot>`;
  }
}
