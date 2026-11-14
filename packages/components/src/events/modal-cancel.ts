/**
 * Fired by `modal` before it closes at the user's request: its close button,
 * Escape, a click outside (`closedby="any"`), `requestClose()` or the
 * `--request-close` command. `preventDefault()` keeps it open, for unsaved
 * changes for instance. Not cancelable when the browser closes it anyway:
 * Escape pressed again without any interaction in between.
 */
export class ModalCancelEvent extends Event {
  constructor({ cancelable = true }: { cancelable?: boolean } = {}) {
    super("u-cancel", { bubbles: true, cancelable, composed: true });
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-cancel": ModalCancelEvent;
  }
}
