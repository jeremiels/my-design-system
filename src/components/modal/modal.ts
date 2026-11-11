import type { PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../base-element.js";
import { Button } from "../button/button.js";
import modalStyles from "./modal.css" with { type: "css" };

/**
 * A modal dialog opened by its own trigger button. Built on the native
 * `<dialog>`: the browser provides the backdrop, closes it on Escape and
 * makes the rest of the page inert while it's open.
 *
 * @element u-modal
 * @summary A modal dialog with a built-in trigger.
 * @slot - The dialog content.
 * @csspart trigger - The opening button: the `button` component of the same registration.
 * @csspart dialog - The native `<dialog>`.
 * @csspart content - The content wrapper inside the dialog.
 * @csspart close-button - The native button that closes the dialog.
 * @cssprop [--u-modal-background-color=var(--u-color-surface-raised)] - Content background color.
 * @cssprop [--u-modal-border-radius=var(--u-radius-lg)] - Corner radius.
 * @cssprop [--u-modal-padding=var(--u-spacing-md)] - Content padding.
 * @cssprop [--u-modal-backdrop-color=var(--u-shadow-backdrop)] - Backdrop color.
 * @cssprop [--u-modal-shadow=var(--u-shadow-elevation-lg)] - Dialog shadow.
 */
export class Modal extends DSBaseElement {
  static override componentName = "modal";

  /** Renders the trigger with the `button` of its own registration (ADR 0001, D2). */
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
   * Accessible label for the built-in close button.
   * @default "Close"
   */
  @property({ type: String })
  closeLabel = "Close";

  /** @internal */
  @query("dialog") dialog!: HTMLDialogElement;

  static styles = [DSBaseElement.styles ?? [], modalStyles];

  render() {
    const button = this.tagFor(Button);
    return html`
      <${button} part="trigger" @click=${this.openModal}>Open modal</${button}>
      <dialog part="dialog" @close=${this.handleDialogClose}>
        <div part="content" class="content">
          <button part="close-button" autofocus @click=${this.closeModal}>
            ${this.closeLabel}
          </button>
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
   * (close button, Escape key, or a future close-on-backdrop-click) — the
   * single place that keeps `open` truthful to the actual dialog state.
   */
  private handleDialogClose() {
    this.open = false;
  }

  openModal() {
    this.open = true;
  }

  closeModal() {
    this.open = false;
  }
}
