import chevronDown from "@unicorne/icons/chevron-down";
import chevronLeft from "@unicorne/icons/chevron-left";
import chevronRight from "@unicorne/icons/chevron-right";
import type { PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { DirectionController } from "../../controllers/direction.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { Icon } from "../icon/icon.js";
import treeItemStyles from "./tree-item.css" with { type: "css" };

/**
 * An item of a `tree`: a row, and its own `tree-item` children, shown while
 * it is `expanded`. Its tree gives it the focus, its level and its choice
 * (ADR 0024).
 *
 * The host has `role="treeitem"`, `aria-level`, `aria-selected`, and
 * `aria-expanded` when it has children. Its `label` is its accessible name:
 * its content also holds its children.
 *
 * @element u-tree-item
 * @summary An item of a tree, with its children.
 * @slot - The `tree-item` children, shown while `expanded`.
 * @csspart row - The row: the chevron and the label.
 * @csspart toggle - The chevron of an item with children: a click opens or closes it.
 * @csspart group - The wrapper of the children, `role="group"`.
 */
export class TreeItem extends withDisabled(DSBaseElement) {
  static {
    // Its chevrons render at once, on a server too (ADR 0032).
    Icon.bundle({
      "chevron-down": chevronDown,
      "chevron-left": chevronLeft,
      "chevron-right": chevronRight,
    });
  }

  static override componentName = "tree-item";

  static override dependencies = [Icon];

  static styles = [super.styles ?? [], treeItemStyles];

  /** The text direction: the chevron of a closed item points along it. */
  #direction = new DirectionController(this);

  /** The `value` of its tree while it is chosen. */
  @property({ type: String })
  value = "";

  /** The label of the row, and the accessible name of the item. Required. */
  @property({ type: String })
  label = "";

  /** Whether its children show. Reflected. */
  @property({ type: Boolean, reflect: true })
  expanded = false;

  /** Whether the item is chosen. Set by its tree, from the tree's `value`. Reflected. */
  @property({ type: Boolean, reflect: true })
  selected = false;

  /** @internal Its depth, from 1. Set by its tree. */
  @property({ attribute: false })
  level = 1;

  /** Its `tree-item` children. */
  get items(): readonly TreeItem[] {
    return Array.from(this.children ?? []).filter(
      (child): child is TreeItem => child instanceof TreeItem,
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "treeitem");
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    // The label, not the content: the content holds the children too.
    this.setAttribute("aria-label", this.label);
    this.setAttribute("aria-level", String(this.level));
    this.setAttribute("aria-selected", this.selected ? "true" : "false");
    if (this.items.length > 0) {
      this.setAttribute("aria-expanded", this.expanded ? "true" : "false");
    } else {
      this.removeAttribute("aria-expanded");
    }
  }

  render() {
    const parent = this.items.length > 0;
    const icon = this.tagFor(Icon);
    const chevron = this.expanded ? "chevron-down" : `chevron-${this.#direction.side("end")}`;
    return html`
      <div part="row" class="row" style=${styleMap({ "--tree-level": String(this.level - 1) })}>
        <span part="toggle" class="toggle${parent ? "" : " toggle--leaf"}" aria-hidden="true"
          ><${icon} class="chevron" name=${chevron}></${icon}
        ></span>
        <span class="label">${this.label}</span>
      </div>
      <div part="group" class="group" role="group" ?hidden=${!this.expanded}>
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
    `;
  }
}
