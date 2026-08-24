import { LitElement, html, css } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import "../button/button.ts";

@customElement("my-modal")
export class Modal extends LitElement {
  @property({ type: Boolean }) open = false;
  @query("dialog") dialog!: HTMLDialogElement;

  /**
   * CSS Tokens (customize via CSS custom properties on `my-modal`):
   *
   * --my-modal-background-color  Content background (default: var(--color-surface-raised))
   * --my-modal-border-radius     Corner radius (default: var(--radius-lg))
   * --my-modal-padding           Internal padding (default: var(--spacing-md))
   * --my-modal-backdrop-color    Backdrop overlay color (default: var(--shadow-backdrop))
   * --my-modal-shadow            Elevation shadow (default: var(--shadow-elevation-lg))
   *
   * @see src/docs/architecture/css-architecture.mdx for token conventions.
   */
  static styles = css`
    :host {
      --my-modal-background-color: var(--color-surface-raised);
      --my-modal-border-radius: var(--radius-lg);
      --my-modal-padding: var(--spacing-md);
      --my-modal-backdrop-color: var(--shadow-backdrop);
      --my-modal-shadow: var(--shadow-elevation-lg);
    }

    dialog {
      border: none;
      border-radius: var(--my-modal-border-radius);
      padding: 0;
      box-shadow: var(--my-modal-shadow);
    }
    dialog::backdrop {
      background-color: var(--my-modal-backdrop-color);
    }
    .content {
      background-color: var(--my-modal-background-color);
      border-radius: inherit;
      padding: var(--my-modal-padding);
    }
  `;

  render() {
    return html`
      <my-button @click=${this.openModal}>Open modal</my-button>
      <dialog>
        <div class="content">
          <button autofocus @click=${this.closeModal}>Fermer</button>
          <slot></slot>
        </div>
      </dialog>
    `;
  }

  openModal() {
    this.open = true;
    this.dialog?.showModal();
  }

  closeModal() {
    this.open = false;
    this.dialog?.close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "my-modal": Modal;
  }
}
