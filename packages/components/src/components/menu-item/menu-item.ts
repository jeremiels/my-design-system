import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../../bases/base-element.js";
import menuItemStyles from "./menu-item.css" with { type: "css" };
import type { MenuItemType } from "./menu-item.type.js";

/** The role of each type of item. */
const ROLES: Record<MenuItemType, string> = {
  normal: "menuitem",
  checkbox: "menuitemcheckbox",
  radio: "menuitemradio",
};

/**
 * An item of a `menu`: an action, or a choice (ADR 0021, ADR 0035). The
 * host has the role of its `type`; its content is its accessible name. Its
 * menu gives it the focus, and a click or Enter or Space on it fires its
 * `click`, then closes the menu.
 *
 * `type="checkbox"` makes it a choice that toggles, `type="radio"` one
 * choice among the items of the same `name`: `menuitemcheckbox` or
 * `menuitemradio`, and `aria-checked`. A box shows the choice before the
 * label, as in a `select` with `multiple`. Space toggles it and keeps the
 * menu open; a click or Enter toggles it, then closes the menu. Each change
 * fires `change` from the item.
 *
 * @element u-menu-item
 * @summary An action or a choice of a menu.
 * @slot - The label of the item.
 * @csspart check - The box of a choice, filled while `checked`.
 * @fires change - When the user checks or unchecks a choice. Its `checked` gives the new state.
 */
export class MenuItem extends withDisabled(DSBaseElement) {
  static override componentName = "menu-item";

  static styles = [super.styles ?? [], menuItemStyles];

  /** A value the application reads in the item's `click`, to tell the items apart. */
  @property({ type: String })
  value = "";

  /** An action (`normal`), a choice that toggles (`checkbox`), or one choice of a group (`radio`). Reflected. */
  @property({ type: String, reflect: true })
  type: MenuItemType = "normal";

  /** Whether a choice is checked: `aria-checked`. Reflected. */
  @property({ type: Boolean, reflect: true })
  checked = false;

  /** The group of a `radio` item: checking it unchecks the items of the same name in its menu. */
  @property({ type: String })
  name = "";

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    this.setAttribute("role", ROLES[this.type] ?? "menuitem");
    if (this.type === "normal") {
      this.removeAttribute("aria-checked");
    } else {
      this.setAttribute("aria-checked", this.checked ? "true" : "false");
    }
  }

  render() {
    return html`<span part="check" class="check" ?hidden=${this.type === "normal"}></span
      ><slot></slot>`;
  }
}
