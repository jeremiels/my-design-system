import { LitElement, html, css, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import "../button/button.js";

@customElement("my-modal")
export class Modal extends LitElement {
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

declare global {
  interface HTMLElementTagNameMap {
    "my-modal": Modal;
  }
}
