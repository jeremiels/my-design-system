import type { ReactiveController, ReactiveControllerHost } from "lit";

export interface HoverIntentControllerOptions {
  /** Shows: the pointer stayed on the host, or the keyboard focused it. */
  show(reason: "hover" | "focus-in"): void;
  /** Hides: the pointer left the host for a while. */
  hide(): void;
  /** How long the pointer stays before `show()`, in milliseconds. 300 by default. */
  showDelay?: number;
  /** How long the pointer stays away before `hide()`, in milliseconds. 100 by default. */
  hideDelay?: number;
}

/**
 * Reactive controller: shows a popup while the pointer rests on its host,
 * or while the keyboard focus is in it. A short pass of the pointer shows
 * nothing; the pointer can move from the trigger to the popup, a
 * descendant of the host, without hiding it. `Tooltip` creates one.
 *
 * The keyboard focus shows at once: `:focus-visible`, not a click. The
 * focus leaving is the `DismissController`'s.
 *
 * @example
 * class AcmeTooltip extends PopupBase {
 *   constructor() {
 *     super();
 *     new HoverIntentController(this, {
 *       show: (reason) => this.showPopup(reason),
 *       hide: () => this.hidePopup("hover"),
 *     });
 *   }
 * }
 */
export class HoverIntentController implements ReactiveController {
  readonly #options: HoverIntentControllerOptions;

  #timer?: ReturnType<typeof setTimeout>;

  constructor(host: ReactiveControllerHost & HTMLElement, options: HoverIntentControllerOptions) {
    this.#options = options;
    host.addController(this);
    host.addEventListener("pointerenter", () => {
      this.#schedule(() => this.#options.show("hover"), this.#options.showDelay ?? 300);
    });
    host.addEventListener("pointerleave", () => {
      this.#schedule(() => this.#options.hide(), this.#options.hideDelay ?? 100);
    });
    host.addEventListener("focusin", (event) => {
      const target = event.composedPath()[0];
      if (target instanceof Element && target.matches(":focus-visible")) {
        this.#cancel();
        this.#options.show("focus-in");
      }
    });
  }

  hostDisconnected(): void {
    this.#cancel();
  }

  #schedule(callback: () => void, delay: number): void {
    this.#cancel();
    this.#timer = setTimeout(callback, delay);
  }

  #cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }
}
