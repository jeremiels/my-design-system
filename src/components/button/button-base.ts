import { property } from "lit/decorators.js";
import { ClickEvent } from "../../events/button-click.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../base-element.js";
import buttonBaseStyles from "./button-base.css" with { type: "css" };
import type { ButtonSize, ButtonVariant } from "./button.type.js";

/**
 * Shared base of `button` and `button-link`: size, variant, disabled state,
 * click handling and styles. Abstract: extend `Button` or `ButtonLink`.
 *
 * @slot - The button label.
 * @csspart button - The native `<button>` (or `<a>` for `button-link`).
 * @fires {ClickEvent} u-click - On click, unless disabled. `detail.originalEvent` is the native click.
 * @cssprop [--u-button-background-color=var(--u-color-action-bg)] - Background color (variants change the default).
 * @cssprop [--u-button-background-color-hover=var(--u-color-action-bg-hover)] - Background color on hover.
 * @cssprop [--u-button-background-color-active=var(--u-color-action-bg-active)] - Background color while pressed.
 * @cssprop [--u-button-text-color=var(--u-color-action-text)] - Text color.
 * @cssprop [--u-button-border=none] - Border shorthand.
 * @cssprop [--u-button-border-radius=var(--u-radius-md)] - Corner radius.
 * @cssprop [--u-button-font-family=var(--u-font-family-base)] - Font family.
 * @cssprop [--u-button-font-size=var(--u-font-size-base)] - Font size (sizes change the default).
 * @cssprop [--u-button-font-weight=var(--u-font-weight-medium)] - Font weight.
 * @cssprop [--u-button-padding-inline=var(--u-spacing-md)] - Horizontal padding (sizes change the default).
 * @cssprop [--u-button-padding-block=var(--u-spacing-sm)] - Vertical padding (sizes change the default).
 * @cssprop [--u-button-focus-ring-color=var(--u-color-focus-ring)] - Focus outline color.
 * @cssprop [--u-button-focus-ring-width=var(--u-focus-ring-width)] - Focus outline width.
 * @cssprop [--u-button-focus-ring-offset=var(--u-focus-ring-offset)] - Focus outline offset.
 * @cssprop [--u-button-transition-duration=var(--u-motion-duration-fast)] - Background color transition duration.
 */
export abstract class ButtonBase extends withDisabled(DSBaseElement) {
  /** Button size. */
  @property({ type: String })
  size: ButtonSize = "medium";

  /** Button variant: `primary`, `secondary` or a semantic variant. */
  @property({ type: String })
  variant: ButtonVariant = "primary";

  static styles = [super.styles ?? [], buttonBaseStyles];

  protected handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    this.dispatchEvent(new ClickEvent({ originalEvent: e }));
  }

  protected abstract render(): unknown;
}
