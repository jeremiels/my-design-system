import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Reads the text direction of its host when it connects, and renders the
 * host again when it changed: a chevron that points back or forward follows
 * it. `:dir()` is missing before Chrome 120 and Firefox 126.
 *
 * The first render, on a server too, is left to right: the direction is
 * known once the host is in the page.
 */
export class DirectionController implements ReactiveController {
  #host: ReactiveControllerHost & HTMLElement;
  #rtl = false;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.#host = host;
    host.addController(this);
  }

  /** Whether the text of the host runs right to left, as of its last connection. */
  get rtl(): boolean {
    return this.#rtl;
  }

  /** `start` or `end` as a physical side: `left` or `right`. */
  side(edge: "start" | "end"): "left" | "right" {
    return (edge === "start") !== this.#rtl ? "left" : "right";
  }

  hostConnected(): void {
    const rtl = getComputedStyle(this.#host).direction === "rtl";
    if (rtl !== this.#rtl) {
      this.#rtl = rtl;
      this.#host.requestUpdate();
    }
  }
}
