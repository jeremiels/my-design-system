/**
 * Typeahead, without DOM nor Lit (ADR 0010): the user types the start of an
 * item's label, and the item becomes active. `Select` uses it; a menu, a
 * list or a tree can too.
 */

/** The text typed in a row, and when its last character came. */
export interface TypeaheadState {
  readonly text: string;
  readonly time: number;
}

/** No text typed. */
export const emptyTypeahead: TypeaheadState = { text: "", time: Number.NEGATIVE_INFINITY };

/** How long the typed text lasts after a key, in milliseconds. */
export const TYPEAHEAD_DELAY = 500;

/** What typeahead needs to know of an item. */
export interface TypeaheadItem {
  /** The text the user types the start of. */
  readonly label: string;
  readonly disabled?: boolean;
}

/** Text compared without case nor accents: "év" matches "Évry". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

/** Whether a key types a character for typeahead. Space only continues a typed text: alone, it picks. */
export function isTypeaheadKey(
  event: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean },
  state: TypeaheadState,
  time: number,
): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || [...event.key].length !== 1) {
    return false;
  }
  return event.key !== " " || (state.text !== "" && time - state.time <= TYPEAHEAD_DELAY);
}

/**
 * Adds `key`, typed at `time`, to the typed text, and finds the item it
 * leads to: the first enabled item whose label starts with the text, after
 * the active one when the text is a single character, looping. The same
 * character typed again moves to the next item that starts with it. -1 when
 * no item matches.
 */
export function typeahead(
  state: TypeaheadState,
  key: string,
  time: number,
  items: readonly TypeaheadItem[],
  activeIndex: number,
): { state: TypeaheadState; index: number } {
  const text = time - state.time > TYPEAHEAD_DELAY ? key : state.text + key;
  const next = { text, time };
  const search = normalizeText(text);
  const chars = [...search];
  const repeated = chars.every((char) => char === chars[0]);
  // "aaa": the items that start with "a", one after the other.
  const prefix = repeated ? chars[0]! : search;
  const start = repeated ? activeIndex + 1 : Math.max(activeIndex, 0);
  for (let offset = 0; offset < items.length; offset++) {
    const index = (start + offset + items.length) % items.length;
    const item = items[index]!;
    if (!item.disabled && normalizeText(item.label).startsWith(prefix)) {
      return { state: next, index };
    }
  }
  return { state: next, index: -1 };
}
