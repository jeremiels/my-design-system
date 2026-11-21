/**
 * The state of a collection of items, without DOM nor Lit (ADR 0010): which
 * item is active after a move, and which move a key makes. The items are the
 * options of a list (`ListboxController`, `comboboxReducer()`), and the
 * members of a composite widget: radios, tabs, the items of a menu or of a
 * toolbar.
 */

/** Where the active item of a collection moves. `none`: no item is active. */
export type CollectionMove = "next" | "previous" | "first" | "last" | "none";

/** What a move needs to know of an item. */
export interface CollectionItem {
  /** The item shows, but the user can't reach nor pick it. */
  disabled?: boolean;
}

/**
 * The arrow keys that move through a collection: ArrowDown and ArrowUp for
 * `vertical`, ArrowRight and ArrowLeft for `horizontal`, all four for `both`
 * (a radio group).
 */
export type CollectionAxis = "vertical" | "horizontal" | "both";

/** The keys that move through a collection. */
export interface CollectionKeys {
  /** The arrow keys that move. */
  axis: CollectionAxis;
  /** The direction of the text, from CSS `direction`: ArrowLeft moves to the next item in `rtl`. `ltr` by default. */
  direction?: "ltr" | "rtl";
  /** Home and End move to the first and last items. `false` by default: in a text input, they move the caret. */
  homeEnd?: boolean;
}

/** The indexes of the items the user can reach. */
export function enabledIndexes(items: readonly CollectionItem[]): number[] {
  return items.flatMap((item, index) => (item.disabled ? [] : [index]));
}

/**
 * The index of the active item after a move, -1 for none: the next or
 * previous enabled item, looping at the ends, or the first or last enabled
 * one. Without an enabled item, none is active.
 */
export function moveIndex(
  items: readonly CollectionItem[],
  activeIndex: number,
  to: CollectionMove,
): number {
  const enabled = enabledIndexes(items);
  if (to === "none" || enabled.length === 0) {
    return -1;
  }
  const position = enabled.indexOf(activeIndex);
  if (to === "first" || (to === "next" && (position < 0 || position === enabled.length - 1))) {
    return enabled[0]!;
  }
  if (to === "last" || (to === "previous" && position <= 0)) {
    return enabled[enabled.length - 1]!;
  }
  return enabled[position + (to === "next" ? 1 : -1)]!;
}

/** The move of a key in a collection. `undefined` for a key that doesn't move. */
export function collectionKeyMove(
  key: string,
  { axis, direction = "ltr", homeEnd = false }: CollectionKeys,
): CollectionMove | undefined {
  if (axis !== "horizontal") {
    if (key === "ArrowDown") {
      return "next";
    }
    if (key === "ArrowUp") {
      return "previous";
    }
  }
  if (axis !== "vertical" && (key === "ArrowRight" || key === "ArrowLeft")) {
    return (key === "ArrowRight") === (direction === "ltr") ? "next" : "previous";
  }
  if (homeEnd && (key === "Home" || key === "End")) {
    return key === "Home" ? "first" : "last";
  }
  return undefined;
}
