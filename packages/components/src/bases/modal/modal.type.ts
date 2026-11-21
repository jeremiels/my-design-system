/**
 * What closes the modal besides its own API, as the `closedby` attribute of
 * `<dialog>`: `any` adds a click outside to `closerequest` (Escape, the back
 * gesture); `none` leaves only the close button, the commands and the methods.
 */
export type ModalClosedBy = "any" | "closerequest" | "none";

/**
 * Why the modal is about to close, in `u-cancel` (`ModalCancelEvent`):
 * `close-press`, its close button; `escape-key`, Escape; `outside-press`, a
 * press on the backdrop (`closedby="any"`); `back`, a close request of the
 * system without Escape, such as the back button or gesture of Android;
 * `imperative`, `requestClose()` or the `--request-close` command.
 */
export type ModalCancelReason =
  | "close-press"
  | "escape-key"
  | "outside-press"
  | "back"
  | "imperative";
