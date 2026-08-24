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
   * Every default resolves through the design system's semantic token layer, so
   * retheming the app (e.g. swapping --color-primary) updates every button
   * automatically. Set one of the properties above directly only for a one-off
   * override on a single instance.
   */
  static styles = [
    DisabledDSBaseElement.styles ?? [],
    css`
      :host {
        --my-button-background-color: var(--color-action-bg, #007bff);
        --my-button-background-color-hover: var(
          --color-action-bg-hover,
          #0056b3
        );
        --my-button-background-color-active: var(
          --color-action-bg-active,
          #004085
        );
        --my-button-text-color: var(--color-action-text, #fff);
        --my-button-border: none;
        --my-button-border-radius: var(--radius-md, 4px);
        --my-button-font-family: var(--font-family-base, inherit);
        --my-button-font-size: var(--font-size-base, 1rem);
        --my-button-font-weight: 500;
        --my-button-padding-inline: var(--spacing-md, 1rem);
        --my-button-padding-block: var(--spacing-sm, 0.5rem);
        --my-button-focus-ring-color: var(--color-focus-ring, #0056b3);
        --my-button-focus-ring-width: var(--focus-ring-width, 2px);
        --my-button-focus-ring-offset: var(--focus-ring-offset, 2px);
        --my-button-transition-duration: var(--motion-duration-fast, 150ms);
        --my-button-disabled-opacity: var(--opacity-disabled, 0.6);
      }

      /* Reduced-motion fallback for consumers who don't load the DS token sheet */
      @media (prefers-reduced-motion: reduce) {
        :host {
          --my-button-transition-duration: 0ms;
        }
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
          var(--motion-easing-standard, ease);
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

      /* Windows High Contrast Mode / forced-colors: rely on system colors,
         custom properties are ignored there. */
      @media (forced-colors: active) {
        .button {
          border: 1px solid ButtonText;
        }
        .button:focus-visible {
          outline-color: Highlight;
        }
      }

      .button--secondary {
        --my-button-background-color: var(--color-secondary-bg, #6c757d);
        --my-button-background-color-hover: var(
          --color-secondary-bg-hover,
          #565e64
        );
        --my-button-background-color-active: var(
          --color-secondary-bg-active,
          #4b5359
        );
        --my-button-text-color: var(--color-secondary-text, #fff);
      }

      .button--success {
        --my-button-background-color: var(--color-success-bg, #4caf50);
        --my-button-background-color-hover: var(
          --color-success-bg-hover,
          #3d8b40
        );
        --my-button-background-color-active: var(
          --color-success-bg-active,
          #2e6930
        );
        --my-button-text-color: var(--color-success-text, #fff);
      }

      .button--danger {
        --my-button-background-color: var(--color-danger-bg, #f44336);
        --my-button-background-color-hover: var(
          --color-danger-bg-hover,
          #c3352b
        );
        --my-button-background-color-active: var(
          --color-danger-bg-active,
          #922720
        );
        --my-button-text-color: var(--color-danger-text, #fff);
      }

      .button--warning {
        --my-button-background-color: var(--color-warning-bg, #ff9800);
        --my-button-background-color-hover: var(
          --color-warning-bg-hover,
          #cc7a00
        );
        --my-button-background-color-active: var(
          --color-warning-bg-active,
          #995c00
        );
        --my-button-text-color: var(--color-warning-text, #fff);
      }

      .button--information {
        --my-button-background-color: var(--color-information-bg, #2196f3);
        --my-button-background-color-hover: var(
          --color-information-bg-hover,
          #1a78c2
        );
        --my-button-background-color-active: var(
          --color-information-bg-active,
          #135a91
        );
        --my-button-text-color: var(--color-information-text, #fff);
      }

      .button--small {
        --my-button-font-size: var(--font-size-sm, 0.875rem);
        --my-button-padding-inline: var(--spacing-sm, 0.5rem);
        --my-button-padding-block: var(--spacing-2xs, 0.125rem);
      }

      .button--large {
        --my-button-font-size: var(--font-size-lg, 1.25rem);
        --my-button-padding-inline: var(--spacing-lg, 1.5rem);
        --my-button-padding-block: var(--spacing-md, 1rem);
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
