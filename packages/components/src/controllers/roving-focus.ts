import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
  collectionKeyMove,
  enabledIndexes,
  moveIndex,
  type CollectionAxis,
} from "../state/collection.js";

export interface RovingFocusControllerOptions {
  /** The items, in order: the radios of a group, the tabs of a list. */
  items(): readonly HTMLElement[];
  /**
   * The index of the item the Tab key reaches: the checked radio, the
   * selected tab. -1, or a disabled item: the first enabled one.
   */
  activeIndex(): number;
  /** The arrow keys that move the focus: `both` for a radio group. */
  axis(): CollectionAxis;
  /** Home and End move to the first and last items. */
  homeEnd?: boolean;
  /** Called once the keyboard has moved the focus to the item at `index`: a radio group checks it. */
  moved?(index: number): void;
  /** Whether the user can't reach `item`. By default: `:disabled`, or `aria-disabled="true"`. */
  isDisabled?(item: HTMLElement): boolean;
}

function isDisabledItem(item: HTMLElement): boolean {
  return item.matches(":disabled") || item.getAttribute("aria-disabled") === "true";
}

/**
 * Reactive controller: a roving tabindex over the items of a composite
 * widget. Tab reaches one item, `activeIndex()`; the arrow keys move the
 * focus to the next and previous enabled items, looping at the ends, along
 * the text direction. `RadioGroup` creates one.
 *
 * The items are elements the user focuses: the hosts of `radio`, of their
 * own `role`. The controller sets their `tabindex` after each render of the
 * host: render the host again when the items change (`slotchange`).
 *
 * @example
 * class AcmeToolbar extends DSBaseElement {
 *   #roving = new RovingFocusController(this, {
 *     items: () => [...this.querySelectorAll<HTMLElement>(":scope > acme-button")],
 *     activeIndex: () => this.#last,
 *     axis: () => "horizontal",
 *     moved: (index) => (this.#last = index),
 *   });
 * }
 */
export class RovingFocusController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;

  readonly #options: RovingFocusControllerOptions;

  constructor(host: ReactiveControllerHost & HTMLElement, options: RovingFocusControllerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
    host.addEventListener("keydown", this.#onKeydown);
  }

  hostUpdated(): void {
    this.update();
  }

  /** Sets the `tabindex` of the items: 0 for the one Tab reaches, -1 for the others. */
  update(): void {
    const items = this.#options.items();
    const tabbable = this.#tabbableIndex(items);
    items.forEach((item, index) => {
      item.tabIndex = index === tabbable ? 0 : -1;
    });
  }

  #isDisabled(item: HTMLElement): boolean {
    return (this.#options.isDisabled ?? isDisabledItem)(item);
  }

  #tabbableIndex(items: readonly HTMLElement[]): number {
    const active = this.#options.activeIndex();
    const enabled = enabledIndexes(items.map((item) => ({ disabled: this.#isDisabled(item) })));
    return enabled.includes(active) ? active : (enabled[0] ?? -1);
  }

  #onKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const items = this.#options.items();
    const path = event.composedPath();
    const current = items.findIndex((item) => path.includes(item));
    if (current < 0) {
      return;
    }
    const direction = getComputedStyle(this.#host).direction === "rtl" ? "rtl" : "ltr";
    const move = collectionKeyMove(event.key, {
      axis: this.#options.axis(),
      direction,
      homeEnd: this.#options.homeEnd,
    });
    if (!move) {
      return;
    }
    const next = moveIndex(
      items.map((item) => ({ disabled: this.#isDisabled(item) })),
      current,
      move,
    );
    if (next < 0) {
      return;
    }
    event.preventDefault();
    items.forEach((item, index) => {
      item.tabIndex = index === next ? 0 : -1;
    });
    items[next]!.focus();
    this.#options.moved?.(next);
  };
}
