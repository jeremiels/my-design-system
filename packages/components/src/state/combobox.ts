/**
 * The state of a combobox, without DOM nor Lit (ADR 0010): whether its popup
 * is open, which item of the popup is active, and whether the popup follows
 * what the user types. `ComboboxBase` holds a state, reads the context from
 * its properties and its DOM, and sends the events.
 */
import { moveIndex, type CollectionItem, type CollectionMove } from "./collection.js";

/**
 * Where the keyboard enters the popup when it opens it: its first item
 * (ArrowDown), its last (ArrowUp), or none (Alt+ArrowDown).
 */
export type ComboboxEntry = "first" | "last" | "none";

export interface ComboboxState {
  /** Whether the popup is open. */
  readonly open: boolean;
  /** Index of the active item of the popup, -1 when none. */
  readonly activeIndex: number;
  /**
   * Whether the user has typed since the popup last closed. While they
   * type, the popup follows its content: it opens when there is some, an
   * answer from a server for instance, and closes when there is none.
   */
  readonly typed: boolean;
}

/** A combobox at rest: closed, no active item. */
export const closedCombobox: ComboboxState = { open: false, activeIndex: -1, typed: false };

/** What the combobox is like when an event happens. */
export interface ComboboxContext {
  /** Whether the field is disabled or read-only: the popup doesn't open. */
  readonly disabled: boolean;
  /** Whether the popup has something to show: it doesn't open empty. */
  readonly hasContent: boolean;
  /** The items the keyboard moves through, in the order of the popup. */
  readonly items: readonly CollectionItem[];
  /** Whether the control holds some text. */
  readonly hasText: boolean;
  /** Whether the control has the focus. */
  readonly focused: boolean;
}

export type ComboboxEvent =
  /** The keyboard opens the popup, and enters it at `entry`. */
  | { type: "open"; entry: ComboboxEntry }
  /** The application sets `open`: the popup shows at the next `sync`, if it can. */
  | { type: "request"; open: boolean }
  /** Escape, Tab, a pick, the focus leaving, a reset. */
  | { type: "close" }
  /** The user changed the text. */
  | { type: "input" }
  /** The items are other ones: an index would point at another item. */
  | { type: "items" }
  /** Before each render: the context may have changed. */
  | { type: "sync" }
  /** The keyboard moves the active item. */
  | { type: "move"; to: CollectionMove }
  /** The pointer is on an item: a disabled one changes nothing. -1: no active item. */
  | { type: "activate"; index: number };

/** Returns `state` itself when `changes` change nothing: the caller compares references. */
function update(state: ComboboxState, changes: Partial<ComboboxState>): ComboboxState {
  const next = { ...state, ...changes };
  return next.open === state.open &&
    next.activeIndex === state.activeIndex &&
    next.typed === state.typed
    ? state
    : next;
}

/**
 * The state after `event`. Returns `state` itself when nothing changes.
 *
 * The popup opens only when the combobox is enabled and has content. Closed,
 * it has no active item.
 */
export function comboboxReducer(
  state: ComboboxState,
  event: ComboboxEvent,
  context: ComboboxContext,
): ComboboxState {
  const canOpen = !context.disabled && context.hasContent;
  switch (event.type) {
    case "open":
      return canOpen
        ? update(state, {
            open: true,
            activeIndex: moveIndex(context.items, -1, event.entry),
          })
        : state;
    case "request":
      return update(state, event.open ? { open: true } : closedCombobox);
    case "close":
      return update(state, closedCombobox);
    case "input":
      // Without text, there is nothing to follow.
      return context.hasText
        ? update(state, { typed: true, activeIndex: -1, open: canOpen })
        : update(state, closedCombobox);
    case "items":
      return update(state, { activeIndex: -1 });
    case "sync": {
      if (state.open) {
        if (!canOpen) {
          return update(state, { open: false, activeIndex: -1 });
        }
        return state.activeIndex < context.items.length
          ? state
          : update(state, { activeIndex: -1 });
      }
      return state.typed && context.hasText && context.focused && canOpen
        ? update(state, { open: true })
        : state;
    }
    case "move":
      return state.open
        ? update(state, {
            activeIndex: moveIndex(context.items, state.activeIndex, event.to),
          })
        : state;
    case "activate": {
      if (event.index < 0) {
        return update(state, { activeIndex: -1 });
      }
      // A disabled item keeps the active one where it is.
      const item = context.items[event.index];
      return item && !item.disabled ? update(state, { activeIndex: event.index }) : state;
    }
  }
}
