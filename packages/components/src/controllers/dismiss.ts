import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * What dismisses a popup, in the vocabulary of the events' `reason`: Escape,
 * a press outside the component, the focus leaving it.
 */
export type DismissReason = "escape-key" | "outside-press" | "focus-out";

export interface DismissControllerOptions {
  /** Whether `reason` dismisses now: the popup is open, for instance. Read at each event. */
  active(reason: DismissReason): boolean;
  /** Dismisses, with its cause. */
  dismiss(reason: DismissReason): void;
  /**
   * Escape in the host dismisses. The controller prevents its default and
   * stops it: a modal around the host stays open. Not while an input method
   * composes the text: Escape cancels the composition there.
   */
  escapeKey?: boolean;
  /** The focus leaving the host dismisses: to the page, or out of the window. */
  focusOut?: boolean;
  /**
   * A press outside the host dismisses: the pointer goes down and up on
   * neither the host nor its descendants, through shadow roots. A popup of
   * its shadow root, in the top layer, is inside. A press outside that moves
   * the focus away dismisses at once, with this cause.
   */
  outsidePress?: boolean;
}

/**
 * Reactive controller: dismisses a popup of its host, and says why. Escape,
 * a press outside the host and the focus leaving it each call `dismiss()`
 * with their `DismissReason`, while `active(reason)` is true. `ComboboxBase`
 * creates one, for Escape and the focus.
 *
 * The component chooses the causes, and passes the reason on to its event.
 * A modal `<dialog>` doesn't need it: the browser dismisses it, and only the
 * dialog receives a press on its backdrop.
 *
 * @example
 * class AcmeMenu extends DSBaseElement {
 *   #dismiss = new DismissController(this, {
 *     active: () => this.open,
 *     dismiss: (reason) => this.hidePopover(reason),
 *     escapeKey: true,
 *     outsidePress: true,
 *     focusOut: true,
 *   });
 * }
 */
export class DismissController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;

  readonly #options: DismissControllerOptions;

  /** The last press started outside the host. */
  #pressedOutside = false;

  constructor(host: ReactiveControllerHost & HTMLElement, options: DismissControllerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
    if (options.escapeKey) {
      host.addEventListener("keydown", this.#onKeydown);
    }
    if (options.focusOut) {
      host.addEventListener("focusout", this.#onFocusout);
    }
  }

  hostConnected(): void {
    if (this.#options.outsidePress) {
      // Captured: a listener of the page that stops the press doesn't hide it.
      document.addEventListener("pointerdown", this.#onPointerdown, true);
      document.addEventListener("pointerup", this.#onPointerup, true);
    }
  }

  hostDisconnected(): void {
    document.removeEventListener("pointerdown", this.#onPointerdown, true);
    document.removeEventListener("pointerup", this.#onPointerup, true);
    this.#pressedOutside = false;
  }

  #onKeydown = (event: KeyboardEvent) => {
    // Safari resets isComposing before the key that ends a composition,
    // which still has keyCode 229.
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      !this.#options.active("escape-key")
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#options.dismiss("escape-key");
  };

  #onFocusout = (event: FocusEvent) => {
    // Retargeted to the host: a move inside its shadow root doesn't reach it.
    // A move to one of its own children does.
    const next = event.relatedTarget;
    if (next instanceof Node && this.#host.contains(next)) {
      return;
    }
    // A press outside moves the focus before it ends: its cause is the press.
    if (this.#pressedOutside && this.#options.active("outside-press")) {
      this.#pressedOutside = false;
      this.#options.dismiss("outside-press");
    } else if (this.#options.active("focus-out")) {
      this.#options.dismiss("focus-out");
    }
  };

  #onPointerdown = (event: PointerEvent) => {
    this.#pressedOutside = this.#isOutside(event) && this.#options.active("outside-press");
  };

  #onPointerup = (event: PointerEvent) => {
    // Down and up outside: a text selection that ends outside isn't a press outside.
    const pressed = this.#pressedOutside;
    this.#pressedOutside = false;
    if (pressed && this.#isOutside(event) && this.#options.active("outside-press")) {
      this.#options.dismiss("outside-press");
    }
  };

  #isOutside(event: PointerEvent): boolean {
    return !event.composedPath().includes(this.#host);
  }
}
