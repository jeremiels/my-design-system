/**
 * The state of a list of options, without DOM nor Lit (ADR 0010): which
 * option is active after a move. `ListboxController` connects it to a list in
 * a shadow root; `comboboxReducer()` uses it for the popup of a combobox.
 */

/** Where the active option of a list moves. `none`: no option is active. */
export type ListboxMove = "next" | "previous" | "first" | "last" | "none";

/** What a move needs to know of an option. */
export interface ListboxItem {
  /** The option shows, but the user can't reach nor pick it. */
  disabled?: boolean;
}

/** The indexes of the options the user can reach. */
export function enabledIndexes(items: readonly ListboxItem[]): number[] {
  return items.flatMap((item, index) => (item.disabled ? [] : [index]));
}

/**
 * The index of the active option after a move, -1 for none: the next or
 * previous enabled option, looping at the ends, or the first or last enabled
 * one. Without an enabled option, none is active.
 */
export function moveActiveIndex(
  items: readonly ListboxItem[],
  activeIndex: number,
  to: ListboxMove,
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

/** The move of a key in a list: ArrowDown and ArrowUp. `undefined` for the other keys. */
export function listboxKeyMove(key: string): ListboxMove | undefined {
  return key === "ArrowDown" ? "next" : key === "ArrowUp" ? "previous" : undefined;
}
