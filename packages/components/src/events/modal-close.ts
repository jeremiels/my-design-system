/**
 * Fired by `modal` when its dialog closes, whatever the cause: its close
 * button, Escape, a click outside, a command, a method, or `open` set to
 * `false`. The native `close` event of the inner `<dialog>` doesn't leave the
 * shadow root.
 */
export class ModalCloseEvent extends Event {
  /**
   * The value the modal closed with, its `returnValue`: the `value` of the
   * button that sent `--close` or `--request-close`, or the argument of
   * `close()` or `requestClose()`. Empty when dismissed without one, by
   * Escape for instance. Not `returnValue`: `Event` has a legacy one.
   */
  readonly value: string;

  constructor(value = "") {
    super("u-close", { bubbles: true, cancelable: false, composed: true });
    this.value = value;
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-close": ModalCloseEvent;
  }
}
