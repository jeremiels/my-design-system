/**
 * Fired by `notice` when the user closes it: the notice is then `hidden`.
 * The application keeps the choice, and moves the focus to the content.
 */
export class NoticeCloseEvent extends Event {
  constructor() {
    super("u-close", { bubbles: true, composed: true });
  }
}
