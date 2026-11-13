/**
 * Fired by `modal` when its dialog closes, whatever the cause: its close
 * button, Escape, or `open` set to `false`. The native `close` event of the
 * inner `<dialog>` doesn't leave the shadow root.
 */
export class ModalCloseEvent extends Event {
  constructor() {
    super("u-close", { bubbles: true, cancelable: false, composed: true });
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-close": ModalCloseEvent;
  }
}
