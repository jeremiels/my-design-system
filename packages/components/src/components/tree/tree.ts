import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { RovingFocusController } from "../../controllers/roving-focus.js";
import { visibleNodes, type TreeNode } from "../../state/tree.js";
import { emptyTypeahead, isTypeaheadKey, typeahead } from "../../state/typeahead.js";
import { TreeItem } from "../tree-item/tree-item.js";
import treeStyles from "./tree.css" with { type: "css" };
import treeTokens from "./tree.tokens.css" with { type: "css" };

/** A tree item as a node of `state/tree.ts`. */
interface ItemNode extends TreeNode {
  readonly item: TreeItem;
  readonly children: readonly ItemNode[];
}

function nodeOf(item: TreeItem): ItemNode {
  return { item, expanded: item.expanded, children: item.items.map(nodeOf) };
}

/**
 * A tree: items in levels, folders and files for instance, each one with
 * its `tree-item` children. The user opens and closes the items, and
 * chooses one: `value` is its `value` (ADR 0024).
 *
 * Its keys follow the ARIA tree view: one Tab stop; ArrowDown and ArrowUp
 * move between the items that show; ArrowRight opens a closed item, or
 * moves to its first child; ArrowLeft closes an open item, or moves to its
 * parent; Home and End reach the first and last items; typing the start of
 * a label moves to it. Enter, Space and a click on a row choose the item,
 * and fire `change`. A click on a chevron opens or closes its item.
 *
 * @element u-tree
 * @summary Items in levels, to open, close and choose.
 * @slot - The `tree-item` elements of the same registration, the roots.
 * @csspart tree - The element of the `tree` role.
 * @fires change - When the user chooses another item: `value` holds its value.
 * @tokens tree - Its tokens (`@cssprop`), shared with its items, from `@unicorne/tokens` (`src/component/tree/`): `npm run analyze` documents them.
 */
export class Tree extends DSBaseElement {
  static override componentName = "tree";

  /** Recognizes its items of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [TreeItem];

  static styles = [super.styles ?? [], treeTokens, treeStyles];

  /** The `value` of the chosen item, or `""`. */
  @property({ type: String })
  value = "";

  /** The accessible name of the tree: what its items are. Required. */
  @property({ type: String })
  label = "";

  /** The item the keys move from. */
  #active?: TreeItem;

  #typeahead = emptyTypeahead;

  #observer?: MutationObserver;

  constructor() {
    super();
    new RovingFocusController(this, {
      items: () => this.visibleItems,
      activeIndex: () =>
        this.visibleItems.indexOf(this.#active ?? this.#chosen ?? this.visibleItems[0]!),
      axis: () => "vertical",
      homeEnd: true,
      moved: (index) => {
        this.#active = this.visibleItems[index];
      },
      isDisabled: (item) => (item as TreeItem).disabled,
    });
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("click", this.#onClick);
    this.addEventListener("focusin", (event) => {
      const item = this.#itemOf(event);
      if (item && item !== this.#active) {
        this.#active = item;
        this.requestUpdate();
      }
    });
  }

  /** The roots. None on a server: the element has no children there. */
  protected get items(): readonly TreeItem[] {
    return Array.from(this.children ?? []).filter(
      (child): child is TreeItem => child instanceof TreeItem,
    );
  }

  /** The items that show, in reading order. */
  protected get visibleItems(): readonly TreeItem[] {
    return visibleNodes(this.items.map(nodeOf)).map(({ item }) => item);
  }

  get #chosen(): TreeItem | undefined {
    return this.value === ""
      ? undefined
      : this.visibleItems.find((item) => item.value === this.value);
  }

  connectedCallback(): void {
    super.connectedCallback();
    // An item opened, closed, disabled, added or removed: the items that show change.
    this.#observer = new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["expanded", "disabled", "value"],
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    const rtl =
      typeof getComputedStyle === "function" && this.isConnected
        ? getComputedStyle(this).direction === "rtl"
        : false;
    const walk = (items: readonly TreeItem[], level: number) => {
      for (const item of items) {
        item.level = level;
        item.selected = this.value !== "" && item.value === this.value;
        item.toggleAttribute("data-rtl", rtl);
        walk(item.items, level + 1);
      }
    };
    walk(this.items, 1);
  }

  #itemOf(event: Event): TreeItem | undefined {
    const path = event.composedPath();
    return path.find((target): target is TreeItem => target instanceof TreeItem);
  }

  /** Chooses `item` at the user's request: `value`, then `change`. */
  #choose(item: TreeItem): void {
    if (item.disabled || item.value === this.value) {
      return;
    }
    this.value = item.value;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #focus(item: TreeItem | undefined): void {
    if (item) {
      this.#active = item;
      this.requestUpdate();
      item.focus();
    }
  }

  #onKeydown = (event: KeyboardEvent) => {
    const item = this.#itemOf(event);
    if (!item || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const rtl = getComputedStyle(this).direction === "rtl";
    const key =
      rtl && event.key === "ArrowRight"
        ? "ArrowLeft"
        : rtl && event.key === "ArrowLeft"
          ? "ArrowRight"
          : event.key;
    if (key === "ArrowRight" && item.items.length > 0) {
      event.preventDefault();
      if (item.expanded) {
        this.#focus(item.items.find((child) => !child.disabled));
      } else {
        item.expanded = true;
      }
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      if (item.expanded && item.items.length > 0) {
        item.expanded = false;
      } else {
        this.#focus(item.parentElement instanceof TreeItem ? item.parentElement : undefined);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#choose(item);
    } else if (isTypeaheadKey(event, this.#typeahead, event.timeStamp)) {
      event.preventDefault();
      const items = this.visibleItems;
      const result = typeahead(
        this.#typeahead,
        event.key,
        event.timeStamp,
        items.map((candidate) => ({ label: candidate.label, disabled: candidate.disabled })),
        items.indexOf(item),
      );
      this.#typeahead = result.state;
      this.#focus(items[result.index]);
    }
  };

  #onClick = (event: MouseEvent) => {
    const item = this.#itemOf(event);
    if (!item || item.disabled) {
      return;
    }
    const onToggle = event
      .composedPath()
      .some((target) => target instanceof Element && target.matches('[part~="toggle"]'));
    if (onToggle && item.items.length > 0) {
      item.expanded = !item.expanded;
    } else {
      this.#choose(item);
    }
    this.#focus(item);
  };

  render() {
    return html`
      <div part="tree" class="tree" role="tree" aria-label=${ifDefined(this.label || undefined)}>
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
    `;
  }
}
