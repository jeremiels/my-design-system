import type { ReactiveController, ReactiveControllerHost } from "lit";

/** An edge of a container, along the text. */
export type OverflowEdge = "start" | "end";

/**
 * Reactive controller: tells whether the content of a scrolling container
 * goes past its start or its end, along the inline axis, and scrolls it.
 * `Tabs` creates one, to show its scroll buttons.
 *
 * It measures the container after each render of the host, when its size
 * changes (`ResizeObserver`) and when it scrolls, and renders the host
 * again when an edge changes. It works in either text direction.
 *
 * @example
 * #overflow = new OverflowController(this, () => this.renderRoot.querySelector(".list"));
 * // render(): ${this.#overflow.start ? html`<button @click=${() => this.#overflow.scroll("start")}>` : nothing}
 */
export class OverflowController implements ReactiveController {
  readonly #host: ReactiveControllerHost;

  readonly #container: () => HTMLElement | null | undefined;

  #observed?: HTMLElement;

  #resize?: ResizeObserver;

  /** Some content goes past the start. */
  start = false;

  /** Some content goes past the end. */
  end = false;

  constructor(host: ReactiveControllerHost, container: () => HTMLElement | null | undefined) {
    this.#host = host;
    this.#container = container;
    host.addController(this);
  }

  hostUpdated(): void {
    const container = this.#container() ?? undefined;
    if (container !== this.#observed) {
      this.#observed?.removeEventListener("scroll", this.#measure);
      this.#resize?.disconnect();
      this.#observed = container;
      if (container && typeof ResizeObserver === "function") {
        container.addEventListener("scroll", this.#measure, { passive: true });
        this.#resize = new ResizeObserver(this.#measure);
        this.#resize.observe(container);
      }
    }
    this.#measure();
  }

  hostDisconnected(): void {
    this.#observed?.removeEventListener("scroll", this.#measure);
    this.#resize?.disconnect();
    this.#observed = undefined;
  }

  /** Scrolls the container towards `edge` by most of its width. */
  scroll(edge: OverflowEdge): void {
    const container = this.#observed;
    if (!container) {
      return;
    }
    const rtl = getComputedStyle(container).direction === "rtl";
    const forward = (edge === "end") !== rtl ? 1 : -1;
    container.scrollBy({ left: forward * container.clientWidth * 0.8, behavior: "smooth" });
  }

  #measure = () => {
    const container = this.#observed;
    if (!container) {
      return;
    }
    // In right-to-left text, scrollLeft goes from 0 to negative values.
    const offset = Math.abs(container.scrollLeft);
    const start = offset > 1;
    const end = offset + container.clientWidth < container.scrollWidth - 1;
    if (start !== this.start || end !== this.end) {
      this.start = start;
      this.end = end;
      this.#host.requestUpdate();
    }
  };
}
