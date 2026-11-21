/**
 * Why a message of a toaster closed, in `u-close` (`ToastCloseEvent`):
 * `timeout`, its duration passed; `close-press`, its close button;
 * `imperative`, `close()`, or a newer message past the maximum.
 */
export type ToastCloseReason = "timeout" | "close-press" | "imperative";

/** Fired by `toaster` when one of its messages closes: `id` is the one `show()` returned. */
export class ToastCloseEvent extends Event {
  /** The id of the message, as `show()` returned it. */
  readonly id: number;

  /** Why the message closed. */
  readonly reason: ToastCloseReason;

  constructor(id: number, reason: ToastCloseReason) {
    super("u-close", { bubbles: true, composed: true });
    this.id = id;
    this.reason = reason;
  }
}
