// The popup of a combobox, without a browser (ADR 0010): when it opens, when
// it closes, which item is active.
import { describe, expect, it } from "vitest";
import {
  closedCombobox,
  comboboxReducer,
  type ComboboxContext,
  type ComboboxEvent,
  type ComboboxState,
} from "./combobox.ts";

const context = (changes: Partial<ComboboxContext> = {}): ComboboxContext => ({
  disabled: false,
  hasContent: true,
  items: [{}, { disabled: true }, {}],
  hasText: true,
  focused: true,
  ...changes,
});
/** The state after these events, each in its context. */
const after = (
  events: [ComboboxEvent, ComboboxContext?][],
  state: ComboboxState = closedCombobox,
) =>
  events.reduce(
    (current, [event, eventContext]) => comboboxReducer(current, event, eventContext ?? context()),
    state,
  );
const open: ComboboxState = { open: true, activeIndex: -1, typed: false };

describe("the keyboard", () => {
  it("opens the popup and enters it at its first or last enabled item, or at none", () => {
    expect(after([[{ type: "open", entry: "first" }]])).toEqual({ ...open, activeIndex: 0 });
    expect(after([[{ type: "open", entry: "last" }]])).toEqual({ ...open, activeIndex: 2 });
    expect(after([[{ type: "open", entry: "none" }]])).toEqual(open);
  });

  it("doesn't open a disabled combobox, nor an empty popup", () => {
    expect(after([[{ type: "open", entry: "first" }, context({ disabled: true })]])).toBe(
      closedCombobox,
    );
    expect(after([[{ type: "open", entry: "first" }, context({ hasContent: false })]])).toBe(
      closedCombobox,
    );
  });

  it("moves the active item through the enabled ones, in an open popup only", () => {
    expect(after([[{ type: "move", to: "next" }]], { ...open, activeIndex: 0 }).activeIndex).toBe(
      2,
    );
    expect(after([[{ type: "move", to: "next" }]])).toBe(closedCombobox);
  });
});

describe("the text", () => {
  it("opens the popup when the user types, and drops the active item", () => {
    expect(after([[{ type: "input" }]], { ...open, activeIndex: 2 })).toEqual({
      open: true,
      activeIndex: -1,
      typed: true,
    });
  });

  it("closes the popup when the user empties the text", () => {
    expect(
      after([[{ type: "input" }, context({ hasText: false })]], { ...open, typed: true }),
    ).toEqual(closedCombobox);
  });

  it("keeps following the content while the user types: closed without any, open again with some", () => {
    const typed = after([[{ type: "input" }, context({ hasContent: false })]]);
    expect(typed).toEqual({ open: false, activeIndex: -1, typed: true });
    // An answer from a server.
    expect(after([[{ type: "sync" }]], typed).open).toBe(true);
    expect(
      after([[{ type: "sync" }, context({ hasContent: false })]], { ...typed, open: true }).open,
    ).toBe(false);
  });

  it("doesn't open on new content once the popup has closed, or without the focus", () => {
    expect(after([[{ type: "input" }], [{ type: "close" }], [{ type: "sync" }]])).toEqual(
      closedCombobox,
    );
    const typed = after([[{ type: "input" }, context({ hasContent: false })]]);
    expect(after([[{ type: "sync" }, context({ focused: false })]], typed).open).toBe(false);
  });
});

describe("the application", () => {
  it("opens the popup at the next sync, if it has content", () => {
    const requested = after([[{ type: "request", open: true }]]);
    expect(after([[{ type: "sync" }]], requested).open).toBe(true);
    expect(after([[{ type: "sync" }, context({ hasContent: false })]], requested).open).toBe(false);
    expect(after([[{ type: "sync" }, context({ disabled: true })]], requested).open).toBe(false);
  });

  it("closes the popup, with no active item left", () => {
    expect(
      after([[{ type: "request", open: false }]], { ...open, activeIndex: 2, typed: true }),
    ).toEqual(closedCombobox);
  });
});

describe("the items", () => {
  it("drops the active item when the items are other ones, or fewer", () => {
    expect(after([[{ type: "items" }]], { ...open, activeIndex: 2 }).activeIndex).toBe(-1);
    expect(
      after([[{ type: "sync" }, context({ items: [{}] })]], { ...open, activeIndex: 2 })
        .activeIndex,
    ).toBe(-1);
  });

  it("activates the enabled item under the pointer, and ignores a disabled one", () => {
    expect(after([[{ type: "activate", index: 2 }]], open).activeIndex).toBe(2);
    expect(after([[{ type: "activate", index: 1 }]], { ...open, activeIndex: 2 }).activeIndex).toBe(
      2,
    );
    expect(
      after([[{ type: "activate", index: -1 }]], { ...open, activeIndex: 2 }).activeIndex,
    ).toBe(-1);
  });
});

it("returns the same state when an event changes nothing", () => {
  const state: ComboboxState = { ...open, activeIndex: 0 };
  expect(comboboxReducer(state, { type: "sync" }, context())).toBe(state);
  expect(comboboxReducer(state, { type: "activate", index: 0 }, context())).toBe(state);
  expect(comboboxReducer(closedCombobox, { type: "close" }, context())).toBe(closedCombobox);
});
