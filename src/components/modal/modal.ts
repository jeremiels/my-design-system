import type { PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { html } from "lit/static-html.js";
import { ModalCloseEvent } from "../../events/modal-close.js";
import { DSBaseElement } from "../base-element.js";
import { Button } from "../button/button.js";
import modalStyles from "./modal.css" with { type: "css" };
import modalTokens from "./modal.tokens.css" with { type: "css" };

/**
 * A modal dialog. Built on the native `<dialog>`: the browser provides the
 * backdrop, closes it on Escape and makes the rest of the page inert while
 * it's open. Open it with `open`, or with a trigger in the `trigger` slot.
 *
 * @element u-modal
 * @summary A modal dialog.
 * @slot - The dialog content.
 * @slot trigger - Optional: an element that opens the dialog when clicked, e.g. a `button`.
 * @csspart dialog - The native `<dialog>`.
 * @csspart content - The content wrapper inside the dialog.
 * @csspart close-button - The button that closes the dialog: the `button` component of the same registration.
 * @fires {ModalCloseEvent} u-close - When the dialog closes, whatever the cause: close button, Escape or `open = false`.
 * @tokens modal - Its tokens (`@cssprop`), from `tokens/component/modal/`: `npm run analyze` documents them.
 */
export class Modal extends DSBaseElement {
  static override componentName = "modal";

  /** Renders its close button with the `button` of its own registration (ADR 0001, D2). */
  static override dependencies = [Button];

  /**
   * Whether the modal is open. Reflects to the `open` attribute, so it can
   * be set declaratively (`<u-modal open>`) or bound reactively
   * (`?open=${state}`) — the underlying `<dialog>` is kept in sync in
   * `updated()`. Reading `.open` always reflects the real dialog state,
   * including when the user closes it via Escape.
   */
  @property({ type: Boolean, reflect: true }) open = false;

  /**
   * Accessible name of the dialog, announced when it opens. Required: a
   * dialog without a name is announced as just "dialog".
   */
  @property({ type: String })
  label?: string;

  /**
   * Accessible label of the built-in close button.
   * @default "Close"
   */
  @property({ type: String, attribute: "close-label" })
  closeLabel = "Close";

  /** @internal */
  @query("dialog") dialog!: HTMLDialogElement;

  /** The next `close` event of the dialog is a reopening, not a closing. */
  private reopening = false;

  static styles = [DSBaseElement.styles ?? [], modalTokens, modalStyles];

  connectedCallback() {
    super.connectedCallback();
    // Moved in the DOM while open (a portal, a reordered list…): removing
    // the dialog took it out of the top layer but left it open, as a
    // non-modal dialog — no backdrop, the page isn't inert, Escape doesn't
    // close it. Reopen it as a modal; its `close` event isn't a closing.
    if (this.hasUpdated && this.dialog.open && !this.dialog.matches(":modal")) {
      this.reopening = true;
      this.dialog.close();
      this.dialog.showModal();
    }
  }

  render() {
    const button = this.tagFor(Button);
    // Clicks on the slotted trigger reach the <slot> through the composed path.
    return html`
      <slot name="trigger" @click=${this.openModal}></slot>
      <dialog
        part="dialog"
        aria-label=${ifDefined(this.label || undefined)}
        @close=${this.handleDialogClose}
      >
        <div part="content" class="content">
          <${button} part="close-button" variant="secondary" autofocus @click=${this.closeModal}>
            ${this.closeLabel}
          </${button}>
          <slot></slot>
        </div>
      </dialog>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (changedProperties.has("open")) {
      if (this.open && !this.dialog.open) {
        this.dialog.showModal();
      } else if (!this.open && this.dialog.open) {
        this.dialog.close();
      }
    }
  }

  /**
   * Fires whenever the native <dialog> closes, regardless of cause
   * (close button, Escape key, `open = false`) — the single place that keeps
   * `open` truthful to the actual dialog state and announces the closing.
   */
  private handleDialogClose() {
    if (this.reopening) {
      this.reopening = false;
      return;
    }
    this.open = false;
    this.dispatchEvent(new ModalCloseEvent());
  }

  private openModal() {
    this.open = true;
  }

  private closeModal() {
    this.open = false;
  }
}
