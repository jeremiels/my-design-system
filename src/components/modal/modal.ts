import type { PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../MyDSBaseElement.js";
import { Button } from "../button/button.js";
import modalStyles from "./modal.css" with { type: "css" };

export class Modal extends DSBaseElement {
  static override componentName = "modal";

  /** Renders the trigger with the `button` of its own registration (ADR 0001, D2). */
  static override dependencies = [Button];

  /**
   * Whether the modal is open. Reflects to the `open` attribute, so it can
   * be set declaratively (`<my-modal open>`) or bound reactively
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

  @query("dialog") dialog!: HTMLDialogElement;

  /**
   * CSS Tokens (customize via CSS custom properties on `my-modal`):
   *
   * --u-modal-background-color  Content background (default: var(--u-color-surface-raised))
   * --u-modal-border-radius     Corner radius (default: var(--u-radius-lg))
   * --u-modal-padding           Internal padding (default: var(--u-spacing-md))
   * --u-modal-backdrop-color    Backdrop overlay color (default: var(--u-shadow-backdrop))
   * --u-modal-shadow            Elevation shadow (default: var(--u-shadow-elevation-lg))
   *
   * @see src/docs/architecture/css-architecture.mdx for token conventions.
   */
  static styles = [DSBaseElement.styles ?? [], modalStyles];

  render() {
    const button = this.tagFor(Button);
    return html`
      <${button} @click=${this.openModal}>Open modal</${button}>
      <dialog @close=${this.handleDialogClose}>
        <div class="content">
          <button autofocus @click=${this.closeModal}>${this.closeLabel}</button>
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
