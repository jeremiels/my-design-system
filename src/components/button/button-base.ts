import { css } from "lit";
import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.ts";
import { DSBaseElement } from "../MyDSBaseElement.ts";
import type { ComponentSize, ButtonVariant } from "../../types/common.ts";

const DisabledDSBaseElement = withDisabled(DSBaseElement);

export abstract class ButtonBase extends DisabledDSBaseElement {
  /**
   * Button size.
   * @property {ComponentSize} size - The size of the button.
   * @default "medium"
   */
  @property({ type: String })
  size: ComponentSize = "medium";

  /**
   * Button variant.
   * @property {ButtonVariant} variant - The variant of the button.
   * @default "primary"
   */
  @property({ type: String })
  variant: ButtonVariant = "primary";

  /**
   * CSS Tokens (customize via CSS custom properties on `my-button` or `my-button-link`):
   *
   * --my-button-background-color      Background color (default: var(--color-action-bg))
   * --my-button-background-color-hover  Hover background (default: var(--color-action-bg-hover))
   * --my-button-background-color-active Active/pressed background (default: var(--color-action-bg-active))
   * --my-button-text-color            Text color (default: var(--color-action-text))
   * --my-button-border                Border shorthand (default: none)
   * --my-button-border-radius         Corner radius (default: var(--radius-md))
   * --my-button-font-family           Font family (default: var(--font-family-base))
   * --my-button-font-size             Text size (default: var(--font-size-base))
   * --my-button-padding-inline        Horizontal padding (default: var(--spacing-md))
   * --my-button-padding-block         Vertical padding (default: var(--spacing-sm))
   * --my-button-focus-ring-color      Focus outline color (default: var(--color-focus-ring))
   * --my-button-transition-duration   Background transition duration (default: var(--motion-duration-fast))
   *
   * @see src/docs/architecture/css-architecture.mdx for token conventions.
   */
  static styles = [
    DisabledDSBaseElement.styles ?? [],
    css`
      :host {
        --my-button-background-color: var(--color-action-bg);
        --my-button-background-color-hover: var(--color-action-bg-hover);
        --my-button-background-color-active: var(--color-action-bg-active);
        --my-button-text-color: var(--color-action-text);
        --my-button-border: none;
        --my-button-border-radius: var(--radius-md);
        --my-button-font-family: var(--font-family-base);
        --my-button-font-size: var(--font-size-base);
        --my-button-font-weight: var(--font-weight-medium);
        --my-button-padding-inline: var(--spacing-md);
        --my-button-padding-block: var(--spacing-sm);
        --my-button-focus-ring-color: var(--color-focus-ring);
        --my-button-focus-ring-width: var(--focus-ring-width);
        --my-button-focus-ring-offset: var(--focus-ring-offset);
        --my-button-transition-duration: var(--motion-duration-fast);
        --my-button-disabled-opacity: var(--opacity-disabled);
      }

      .button {
        display: inline-grid;
        place-content: center;
        width: fit-content;
        font-family: var(--my-button-font-family);
        font-size: var(--my-button-font-size);
        font-weight: var(--my-button-font-weight);
        padding-inline: var(--my-button-padding-inline);
        padding-block: var(--my-button-padding-block);
        background-color: var(--my-button-background-color);
        color: var(--my-button-text-color);
        border: var(--my-button-border);
        border-radius: var(--my-button-border-radius);
        cursor: pointer;
        transition: background-color var(--my-button-transition-duration)
          var(--motion-easing-standard);
      }

      .button:hover {
        background-color: var(--my-button-background-color-hover);
      }

      .button:active {
        background-color: var(--my-button-background-color-active);
      }

      .button:focus-visible {
        outline: var(--my-button-focus-ring-width) solid
          var(--my-button-focus-ring-color);
        outline-offset: var(--my-button-focus-ring-offset);
      }

      @media (forced-colors: active) {
        .button {
          border: 1px solid ButtonText;
        }
        .button:focus-visible {
          outline-color: Highlight;
        }
      }

      .button--secondary {
        --my-button-background-color: var(--color-secondary-bg);
        --my-button-background-color-hover: var(--color-secondary-bg-hover);
        --my-button-background-color-active: var(--color-secondary-bg-active);
        --my-button-text-color: var(--color-secondary-text);
      }

      .button--success {
        --my-button-background-color: var(--color-success-bg);
        --my-button-background-color-hover: var(--color-success-bg-hover);
        --my-button-background-color-active: var(--color-success-bg-active);
        --my-button-text-color: var(--color-success-text);
      }

      .button--danger {
        --my-button-background-color: var(--color-danger-bg);
        --my-button-background-color-hover: var(--color-danger-bg-hover);
        --my-button-background-color-active: var(--color-danger-bg-active);
        --my-button-text-color: var(--color-danger-text);
      }

      .button--warning {
        --my-button-background-color: var(--color-warning-bg);
        --my-button-background-color-hover: var(--color-warning-bg-hover);
        --my-button-background-color-active: var(--color-warning-bg-active);
        --my-button-text-color: var(--color-warning-text);
      }

      .button--information {
        --my-button-background-color: var(--color-information-bg);
        --my-button-background-color-hover: var(
          --color-information-bg-hover
        );
        --my-button-background-color-active: var(
          --color-information-bg-active
        );
        --my-button-text-color: var(--color-information-text);
      }

      .button--small {
        --my-button-font-size: var(--font-size-sm);
        --my-button-padding-inline: var(--spacing-sm);
        --my-button-padding-block: var(--spacing-2xs);
      }

      .button--large {
        --my-button-font-size: var(--font-size-lg);
        --my-button-padding-inline: var(--spacing-lg);
        --my-button-padding-block: var(--spacing-md);
      }
    `,
  ];

  protected handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    this.dispatchEvent(
      new CustomEvent("my-click", {
        bubbles: true,
        composed: true,
        detail: { originalEvent: e },
      }),
    );
  }

  protected abstract render(): unknown;
}
