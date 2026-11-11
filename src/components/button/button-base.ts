import { property } from "lit/decorators.js";
import { MyClickEvent } from "../../events/button-click.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../MyDSBaseElement.js";
import buttonBaseStyles from "./button-base.css" with { type: "css" };
import type { MyButtonSize, MyButtonVariant } from "./button.type.js";

const DisabledDSBaseElement = withDisabled(DSBaseElement);

export abstract class ButtonBase extends DisabledDSBaseElement {
  /**
   * Button size.
   * @property {ComponentSize} size - The size of the button.
   * @default "md"
   */
  @property({ type: String })
  size: MyButtonSize = "medium";

  /**
   * Button variant.
   * @property {ButtonVariant} variant - The variant of the button.
   * @default "primary"
   */
  @property({ type: String })
  variant: MyButtonVariant = "primary";

  /**
   * CSS Tokens (customize via CSS custom properties on `my-button` or `my-button-link`):
   *
   * --u-button-background-color      Background color (default: var(--u-color-action-bg))
   * --u-button-background-color-hover  Hover background (default: var(--u-color-action-bg-hover))
   * --u-button-background-color-active Active/pressed background (default: var(--u-color-action-bg-active))
   * --u-button-text-color            Text color (default: var(--u-color-action-text))
   * --u-button-border                Border shorthand (default: none)
   * --u-button-border-radius         Corner radius (default: var(--u-radius-md))
   * --u-button-font-family           Font family (default: var(--u-font-family-base))
   * --u-button-font-size             Text size (default: var(--u-font-size-base))
   * --u-button-padding-inline        Horizontal padding (default: var(--u-spacing-md))
   * --u-button-padding-block         Vertical padding (default: var(--u-spacing-sm))
   * --u-button-focus-ring-color      Focus outline color (default: var(--u-color-focus-ring))
   * --u-button-transition-duration   Background transition duration (default: var(--u-motion-duration-fast))
   *
   * @see src/docs/architecture/css-architecture.mdx for token conventions.
   */
  static styles = [DisabledDSBaseElement.styles ?? [], buttonBaseStyles];

  protected handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    this.dispatchEvent(new MyClickEvent({ originalEvent: e }));
  }

  protected abstract render(): unknown;
}
