/**
 * What closes the modal besides its own API, as the `closedby` attribute of
 * `<dialog>`: `any` adds a click outside to `closerequest` (Escape, the back
 * gesture); `none` leaves only the close button, the commands and the methods.
 */
export type ModalClosedBy = "any" | "closerequest" | "none";
