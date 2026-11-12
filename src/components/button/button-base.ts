import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../base-element.js";
import buttonBaseStyles from "./button-base.css" with { type: "css" };
import buttonTokens from "./button.tokens.css" with { type: "css" };
import type { ButtonSize, ButtonVariant } from "./button.type.js";

/**
 * Shared base of `button` and `button-link`: size, variant, disabled state,
 * click handling and styles. Abstract: extend `Button` or `ButtonLink`.
 * Focus is delegated to the native control, so `focus()` and `autofocus`
 * work on the host.
 *
 * @slot - The button label.
 * @csspart button - The native `<button>` (or `<a>` for `button-link`).
 * @fires click - The native click of the inner control, composed out of the shadow root. Never fired while disabled.
 * @tokens button - Its tokens (`@cssprop`), from `tokens/component/button/`: `npm run analyze` documents them.
 */
export abstract class ButtonBase extends withDisabled(DSBaseElement) {
  /** Button size. */
  @property({ type: String, reflect: true })
  size: ButtonSize = "medium";

  /** Button variant: `primary`, `secondary` or a semantic variant. */
  @property({ type: String, reflect: true })
  variant: ButtonVariant = "primary";

  static styles = [super.styles ?? [], buttonTokens, buttonBaseStyles];

  static shadowRootOptions: ShadowRootInit = { ...super.shadowRootOptions, delegatesFocus: true };

  /**
   * Handles clicks on the inner control. While disabled, cancels the click
   * and keeps it from reaching the host (a link without `href` still
   * dispatches one). Subclasses add their behavior after calling it.
   */
  protected handleClick(e: MouseEvent) {
    if (this.isDisabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  protected abstract render(): unknown;
}
