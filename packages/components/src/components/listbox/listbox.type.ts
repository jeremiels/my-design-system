/**
 * An option of a list (`ListboxController`): a suggestion of `autocomplete`.
 * The component passes the same object back in `u-select`: the application's
 * own fields (an id, a code) come with it.
 */
export interface ListboxOption {
  /** The value: what the field takes when the user picks the option. */
  value: string;
  /** The text the list shows. `value` without it. */
  label?: string;
  /** The option shows, but the user can't reach nor pick it. */
  disabled?: boolean;
  /** Chosen by default, in a `select` with `multiple`: the `selected` of an `<option>`. */
  selected?: boolean;
}
