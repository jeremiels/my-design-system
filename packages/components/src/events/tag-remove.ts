/**
 * Fired by `tag` when the user presses its remove button. The tag stays:
 * the application removes it, from its data for instance. Inside a
 * `tag-group`, the focus then moves to a neighbor.
 */
export class TagRemoveEvent extends Event {
  constructor() {
    super("u-remove", { bubbles: true, composed: true });
  }
}
