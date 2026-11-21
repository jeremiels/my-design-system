import type { ModalCancelReason } from "../bases/modal/modal.type.js";

/**
 * Fired by `modal` before it closes at the user's request: its close button,
 * Escape, a click outside (`closedby="any"`), `requestClose()` or the
 * `--request-close` command. `reason` says which. `preventDefault()` keeps
 * it open, for unsaved changes for instance. Not cancelable when the browser
 * closes it anyway: Escape pressed again without any interaction in between.
 */
export class ModalCancelEvent extends Event {
  /** Why the modal is about to close. */
  readonly reason: ModalCancelReason;

  constructor(reason: ModalCancelReason, { cancelable = true }: { cancelable?: boolean } = {}) {
    super("u-cancel", { bubbles: true, cancelable, composed: true });
    this.reason = reason;
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-cancel": ModalCancelEvent;
  }
}
