import type { PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { html } from "lit/static-html.js";
import { AnnounceController, announceStyles } from "../../controllers/announce.js";
import { ToastCloseEvent, type ToastCloseReason } from "../../events/toast-close.js";
import { addToast, emptyToastQueue, removeToast, type ToastQueue } from "../../state/toast.js";
import type { SemanticVariant } from "../../types/common.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { Button } from "../button/button.js";
import { Icon } from "../icon/icon.js";
import toasterStyles from "./toaster.css" with { type: "css" };
import toasterTokens from "./toaster.tokens.css" with { type: "css" };

/** What `show()` takes besides the message. */
export interface ToastOptions {
  /** Sets the colors, the icon and the announcement, as for `alert`. `information` by default. */
  variant?: SemanticVariant;
  /** How long it shows, in milliseconds. 5000 by default; 0 until the user closes it. */
  duration?: number;
}

/**
 * A toaster: the short messages that follow an action, "Saved", in a corner
 * of the page, above everything else. One toaster per page; the application
 * calls `show()` (ADR 0022).
 *
 * A message leaves after its `duration`, or when the user closes it. The
 * pointer resting on the messages, or the focus in them, holds them. Past
 * `max` messages, the oldest one leaves. Each closing fires `u-close`, with
 * the message's id and the `reason`.
 *
 * A live region announces each message: politely, interrupting for a
 * `warning` or a `danger` one. The messages are in the top layer, a
 * `popover="manual"` shown while it has some.
 *
 * @element u-toaster
 * @summary The short messages that follow an action, in a corner of the page.
 * @csspart list - The list of messages, in the top layer.
 * @csspart toast - A message.
 * @csspart close-button - The close button of a message: the `button` component of the same registration, of the message's variant.
 * @fires {ToastCloseEvent} u-close - When a message closes: its `id`, as `show()` returned it, and the `reason`.
 * @tokens toaster - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/toaster/`): `npm run analyze` documents them.
 */
export class Toaster extends DSBaseElement {
  static override componentName = "toaster";

  /** Renders the icons with the `icon` of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [Button, Icon];

  static styles = [super.styles ?? [], announceStyles, toasterTokens, toasterStyles];

  /** The largest number of messages shown at once. */
  @property({ type: Number })
  max = 3;

  /** The accessible name of the close buttons, in the page's language. */
  @property({ type: String, attribute: "close-label" })
  closeLabel = "Close";

  #queue: ToastQueue = emptyToastQueue;

  #polite = new AnnounceController(this);

  #assertive = new AnnounceController(this, { politeness: "assertive" });

  /** The timers of the messages, and the time each one has left while held. */
  #timers = new Map<
    number,
    { timer?: ReturnType<typeof setTimeout>; left: number; start: number }
  >();

  /** The pointer or the focus is on the messages: their timers wait. */
  #held = false;

  constructor() {
    super();
    // A move over the messages, not their appearance under a still pointer:
    // the browser may fire pointerenter then, and no pointerleave after.
    this.addEventListener("pointermove", () => this.#hold(true));
    this.addEventListener("pointerleave", () => this.#hold(this.matches(":focus-within")));
    this.addEventListener("focusin", () => this.#hold(true));
    this.addEventListener("focusout", (event) => {
      if (!(event.relatedTarget instanceof Node) || !this.contains(event.relatedTarget)) {
        this.#hold(this.matches(":hover"));
      }
    });
  }

  /** Shows `message`, and returns its id, for `close()` and `u-close`. */
  show(message: string, { variant = "information", duration = 5000 }: ToastOptions = {}): number {
    const result = addToast(this.#queue, { message, variant, duration }, Math.max(1, this.max));
    this.#queue = result.queue;
    for (const toast of result.dropped) {
      this.#end(toast.id, "imperative");
    }
    if (duration > 0) {
      this.#timers.set(result.toast.id, { left: duration, start: 0 });
      if (!this.#held) {
        this.#start(result.toast.id);
      }
    }
    const announcer =
      variant === "danger" || variant === "warning" ? this.#assertive : this.#polite;
    announcer.announce(message);
    this.requestUpdate();
    return result.toast.id;
  }

  /** Closes the message `id`, if it still shows. */
  close(id: number): void {
    this.#close(id, "imperative");
  }

  #close(id: number, reason: ToastCloseReason): void {
    const queue = removeToast(this.#queue, id);
    if (queue === this.#queue) {
      return;
    }
    this.#queue = queue;
    this.#end(id, reason);
    this.requestUpdate();
  }

  /** Stops its timer, and fires `u-close`. */
  #end(id: number, reason: ToastCloseReason): void {
    clearTimeout(this.#timers.get(id)?.timer);
    this.#timers.delete(id);
    this.dispatchEvent(new ToastCloseEvent(id, reason));
  }

  #start(id: number): void {
    const entry = this.#timers.get(id);
    if (entry) {
      entry.start = Date.now();
      entry.timer = setTimeout(() => this.#close(id, "timeout"), entry.left);
    }
  }

  #hold(held: boolean): void {
    if (held === this.#held) {
      return;
    }
    this.#held = held;
    for (const [id, entry] of this.#timers) {
      if (held) {
        clearTimeout(entry.timer);
        entry.left = Math.max(0, entry.left - (Date.now() - entry.start));
      } else {
        this.#start(id);
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const entry of this.#timers.values()) {
      clearTimeout(entry.timer);
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    // In the top layer while it has messages: above the page and its modals.
    const list = this.renderRoot.querySelector<HTMLElement>('[part~="list"]');
    // Out of the document, a popover doesn't show: an update may follow the removal.
    if (!list || !this.isConnected || typeof list.showPopover !== "function") {
      return;
    }
    const shown = list.matches(":popover-open");
    if (this.#queue.toasts.length > 0 && !shown) {
      list.showPopover();
    } else if (this.#queue.toasts.length === 0 && shown) {
      list.hidePopover();
    }
  }

  render() {
    const button = this.tagFor(Button);
    const icon = this.tagFor(Icon);
    return html`
      <ol part="list" class="list" role="list" popover="manual">
        ${repeat(
          this.#queue.toasts,
          (toast) => toast.id,
          (toast) => html`
            <li part="toast" class="toast toast--${toast.variant}">
              <${icon} class="icon" name=${toast.variant}></${icon}>
              <span class="message">${toast.message}</span>
              <${button}
                part="close-button"
                class="close"
                variant=${toast.variant}
                size="small"
                label=${this.closeLabel}
                @click=${() => this.#close(toast.id, "close-press")}
              >
                <${icon} name="close"></${icon}>
              </${button}>
            </li>
          `,
        )}
      </ol>
      ${this.#polite.render()} ${this.#assertive.render()}
    `;
  }
}
