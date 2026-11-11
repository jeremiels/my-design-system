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
