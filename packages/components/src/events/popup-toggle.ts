/**
 * Why a popup opened or closed, in `u-toggle` (`PopupToggleEvent`):
 * `trigger-press`, its trigger; `hover`, the pointer resting on its trigger
 * or leaving it; `focus-in`, the keyboard focus on its trigger;
 * `item-press`, an item of a menu;
 * `escape-key`, Escape; `outside-press`, a press outside the component;
 * `focus-out`, the focus leaving it; `imperative`, a method, a command or
 * `open` set by the application.
 */
export type PopupToggleReason =
  | "trigger-press"
  | "hover"
  | "focus-in"
  | "item-press"
  | "escape-key"
  | "outside-press"
  | "focus-out"
  | "imperative";

/**
 * Fired by a popup (`menu`) after it opens or closes, as `toggle` of a
 * native popover: `newState` is its state, `reason` the cause.
 */
export class PopupToggleEvent extends Event {
  /** The state of the popup, after the change. */
  readonly newState: "open" | "closed";

  /** Why the popup opened or closed. */
  readonly reason: PopupToggleReason;

  constructor(newState: "open" | "closed", reason: PopupToggleReason) {
    super("u-toggle", { bubbles: true, composed: true });
    this.newState = newState;
    this.reason = reason;
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-toggle": PopupToggleEvent;
  }
}
