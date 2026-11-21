import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../base-element.js";
import buttonBaseStyles from "./button-base.css" with { type: "css" };
import buttonTokens from "./button.tokens.css" with { type: "css" };
import type { ButtonAppearance, ButtonCurrent, ButtonSize, ButtonVariant } from "./button.type.js";

/**
 * Shared base of `button` and `button-link`: size, variant, appearance,
 * disabled state, click handling and styles. Abstract: extend `Button` or
 * `ButtonLink`. Focus is delegated to the native control, so `focus()` and
 * `autofocus` work on the host, and a negative `tabindex` on the host takes
 * it out of the tab order.
 *
 * The button is the building block of the other components: a composite
 * renders it for every control that looks like a button (`tagFor(Button)`),
 * so a brand's button changes them all (ADR 0031). They set its tokens to
 * fit it: an outer rule beats its `:host` tokens.
 *
 * @slot - The button label.
 * @csspart button - The native `<button>` (or `<a>` for `button-link`).
 * @fires click - The native click of the inner control, composed out of the shadow root. Never fired while disabled.
 * @tokens button - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/button/`): `npm run analyze` documents them.
 */
export abstract class ButtonBase extends withDisabled(DSBaseElement) {
  /** Button size. */
  @property({ type: String, reflect: true })
  size: ButtonSize = "medium";

  /** Button variant: `primary`, `secondary`, `neutral` or a semantic variant. It sets the colors. */
  @property({ type: String, reflect: true })
  variant: ButtonVariant = "primary";

  /** How the variant paints the button: `filled`, `outlined` (a border, no fill) or `plain` (its text only). */
  @property({ type: String, reflect: true })
  appearance: ButtonAppearance = "filled";

  /**
   * The accessible name, for a button whose content is an icon or a shape:
   * the button is then square. Its content names it otherwise.
   */
  @property({ type: String })
  label = "";

  /** The item of a set the button stands for, `page` in a pagination: `aria-current`. */
  @property({ type: String })
  current?: ButtonCurrent;

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

  /**
   * The host's `tabindex`, read for the native control: a negative one takes
   * the control out of the tab order too.
   * @internal
   */
  @property({ type: Number, attribute: "tabindex" })
  hostTabIndex?: number;

  /** The `tabindex` of the native control: `-1` when the host's is negative. */
  protected get controlTabIndex(): string | undefined {
    return this.hostTabIndex !== undefined && this.hostTabIndex < 0 ? "-1" : undefined;
  }

  /** The classes of the native control: `button`, and `button--square` with `label`. */
  protected get controlClasses(): string {
    return this.label ? "button button--square" : "button";
  }

  protected abstract render(): unknown;
}
