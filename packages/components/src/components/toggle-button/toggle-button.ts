import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { html } from "lit/static-html.js";
import { ButtonBase } from "../../bases/button/button-base.js";
import type { ButtonAppearance, ButtonVariant } from "../../bases/button/button.type.js";
import toggleButtonStyles from "./toggle-button.css" with { type: "css" };
import toggleButtonTokens from "./toggle-button.tokens.css" with { type: "css" };

/**
 * A button that stays pressed or released: the bold of a text editor, a
 * filter of a list (ADR 0032). `pressed` is its state, `aria-pressed` on
 * its native control. A click flips it, then fires `input` and `change`,
 * like a checkbox; setting `pressed` fires nothing.
 *
 * Its label stays the same in both states: assistive technologies say the
 * state. A label that says the action instead ("Show the map", then "Hide
 * the map") belongs to a `button`.
 *
 * Released, it is drawn like a `button`, `neutral` and `outlined` by
 * default. Pressed, the tokens of `toggle-button` paint it. In a `toolbar`,
 * the arrow keys move between its buttons.
 *
 * @element u-toggle-button
 * @summary A button pressed or released.
 * @fires input - After a click flips `pressed`. Composed, like the native `input`.
 * @fires change - After `input`.
 * @tokens toggle-button - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/toggle-button/`): `npm run analyze` documents them.
 */
export class ToggleButton extends ButtonBase {
  static override componentName = "toggle-button";

  static styles = [super.styles ?? [], toggleButtonTokens, toggleButtonStyles];

  /** Button variant, for its released state. `neutral` by default. */
  @property({ type: String, reflect: true })
  override variant: ButtonVariant = "neutral";

  /** How the variant paints the released button. `outlined` by default: a control, before it is pressed. */
  @property({ type: String, reflect: true })
  override appearance: ButtonAppearance = "outlined";

  /** Whether the button is pressed: `aria-pressed`. Reflected. */
  @property({ type: Boolean, reflect: true })
  pressed = false;

  constructor() {
    super();
    // A click aimed at the host itself (`click()`): the inner button gets it
    // instead, so the host sees one click and flips once.
    this.addEventListener("click", (event) => {
      if (event.composedPath()[0] !== this) {
        return;
      }
      event.stopImmediatePropagation();
      if (!this.isDisabled) {
        this.renderRoot.querySelector<HTMLButtonElement>(".button")?.click();
      }
    });
  }

  protected override handleClick(e: MouseEvent) {
    super.handleClick(e);
    if (this.isDisabled) {
      return;
    }
    this.pressed = !this.pressed;
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  render() {
    return html`
      <button
        part="button"
        class=${this.controlClasses}
        type="button"
        ?disabled=${this.isDisabled}
        tabindex=${ifDefined(this.controlTabIndex)}
        aria-label=${this.label || nothing}
        aria-current=${ifDefined(this.current)}
        aria-pressed=${this.pressed ? "true" : "false"}
        @click=${this.handleClick}
      >
        <span class="content"><slot></slot></span>
      </button>
    `;
  }
}
