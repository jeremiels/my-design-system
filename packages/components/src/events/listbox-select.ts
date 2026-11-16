import type { ListboxOption } from "../components/listbox/listbox.type.js";

/**
 * Fired when the user picks an option of a list (`withListbox`), by a click
 * or Enter: a suggestion of `autocomplete`, before the field takes its
 * value. `preventDefault()` keeps the field as it is, to navigate to the
 * option's page instead for instance.
 */
export class ListboxSelectEvent extends Event {
  /** The option picked: the very object of `options`, the application's own fields included. */
  readonly option: ListboxOption;

  constructor(option: ListboxOption) {
    super("u-select", { bubbles: true, cancelable: true, composed: true });
    this.option = option;
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    "u-select": ListboxSelectEvent;
  }
}
