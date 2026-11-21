import { html, type ReactiveController, type ReactiveControllerHost } from "lit";
import announceStyles from "./announce.css" with { type: "css" };

/**
 * The sheet of every component that creates an `AnnounceController`: add it
 * to `static styles`. It hides the live region from the screen.
 */
export { announceStyles };

/** How a message interrupts: `polite` waits for the screen reader to finish, `assertive` doesn't. */
export type AnnouncePoliteness = "polite" | "assertive";

export interface AnnounceControllerOptions {
  /** `polite` by default: `role="status"`. `assertive`: `role="alert"`, for an error that can't wait. */
  politeness?: AnnouncePoliteness;
}

/** Added to a message announced twice in a row: a region announces a change of its text. */
const REPEAT = " ";

/**
 * Reactive controller: a live region in the shadow root of its host.
 * Assistive technologies read what `announce()` gives it, without the focus
 * moving: the number of suggestions of a list, a page loaded, a message
 * saved. `ComboboxBase` creates one.
 *
 * Render the region from the first render, with `render()`: a region added
 * with its text isn't announced. It stays empty until `announce()`.
 *
 * @example
 * class AcmePagination extends DSBaseElement {
 *   static styles = [DSBaseElement.styles ?? [], announceStyles, acmePaginationStyles];
 *
 *   #announcer = new AnnounceController(this);
 *
 *   render() {
 *     return html`${this.renderPages()} ${this.#announcer.render()}`;
 *   }
 *
 *   #goTo(page: number) {
 *     this.#announcer.announce(`Page ${page}`);
 *   }
 * }
 */
export class AnnounceController implements ReactiveController {
  readonly #host: ReactiveControllerHost;

  readonly #role: "status" | "alert";

  /** The text of the region. */
  #text = "";

  constructor(
    host: ReactiveControllerHost,
    { politeness = "polite" }: AnnounceControllerOptions = {},
  ) {
    this.#host = host;
    this.#role = politeness === "assertive" ? "alert" : "status";
    host.addController(this);
  }

  /** The message announced last, `""` when none. */
  get message(): string {
    return this.#text.endsWith(REPEAT) ? this.#text.slice(0, -REPEAT.length) : this.#text;
  }

  /**
   * Announces `message`, at the host's next render. The same message as the
   * last one is announced again. `""` empties the region, silently.
   */
  announce(message: string): void {
    this.#text =
      message !== "" && message === this.message && !this.#text.endsWith(REPEAT)
        ? message + REPEAT
        : message;
    this.#host.requestUpdate();
  }

  hostDisconnected(): void {
    // Back in the document, the region holds no stale message.
    if (this.#text !== "") {
      this.announce("");
    }
  }

  /** Renders the live region. */
  render() {
    return html`<div class="announce" role=${this.#role}>${this.#text}</div>`;
  }
}
