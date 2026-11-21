import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import type { FormValue } from "../../mixins/withFormControl.js";
import { FieldBase, fieldIds } from "../field/field-base.js";
import toggleBaseStyles from "./toggle-base.css" with { type: "css" };
import toggleTokens from "./toggle.tokens.css" with { type: "css" };

/**
 * Shared base of the controls with their label after them, `checkbox` and
 * `switch`: a native `<input type="checkbox">`, the control the base draws,
 * then the label, the hint and the error message. Abstract: extend
 * `Checkbox` or `Switch`, or draw another control with `renderIndicator()`.
 * The label, the hint, the error and the validation are those of
 * `FieldBase` (ADR 0017).
 *
 * As a native checkbox, it submits `value` under `name` while checked, and
 * nothing otherwise. The `checked` attribute is the default state: the
 * form's reset restores it. A `required` control can't be submitted
 * unchecked.
 *
 * A `readonly` control keeps its state: a click doesn't change it, and
 * assistive technologies announce it as read-only. A native checkbox has no
 * `readonly`: the base prevents the click.
 *
 * Its `input` and `change` events are those of a native checkbox, on the
 * host.
 *
 * @csspart input - The native `<input type="checkbox">`, invisible, over the drawn control: it takes the clicks and the focus.
 * @tokens toggle - Its layout's tokens (`@cssprop`), shared by `checkbox` and `switch`, from `@unicorne/tokens` (`src/component/toggle/`): `npm run analyze` documents them.
 */
export abstract class ToggleBase extends FieldBase {
  static styles = [super.styles ?? [], toggleTokens, toggleBaseStyles];

  /** Whether the control is checked. The `checked` attribute is the default state: the form's reset restores it. */
  @property({ type: Boolean })
  checked = false;

  /** Submitted under `name` while the control is checked. `on` by default, as on a native checkbox. */
  @property({ type: String })
  override value = "on";

  /** @internal Read-only by its group: `checkbox-group`. Set by the group. */
  @property({ attribute: false })
  groupReadOnly = false;

  /** Whether the user can't change the state: its own `readonly`, or its group's. */
  protected get isReadOnly(): boolean {
    return this.readOnly || this.groupReadOnly;
  }

  protected override get formValue(): FormValue {
    return this.checked ? this.value : null;
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.value = this.getAttribute("value") ?? "on";
    this.checked = this.hasAttribute("checked");
  }

  /** @internal */
  override formStateRestoreCallback(state: FormValue): void {
    // The browser saved the submitted value: none while unchecked.
    this.checked = typeof state === "string";
  }

  /** The `role` of the native control: none for a checkbox, `switch` for a switch. */
  protected get controlRole(): string | typeof nothing {
    return nothing;
  }

  /** Whether the native control shows as indeterminate: never by default. */
  protected get controlIndeterminate(): boolean {
    return false;
  }

  /** Renders the control the base draws, after the native one: `aria-hidden`, its state from `.control:checked`. */
  protected abstract renderIndicator(): unknown;

  protected renderControl() {
    return html`
      <input
        part="input"
        class="control"
        id=${fieldIds.control}
        type="checkbox"
        role=${this.controlRole}
        .checked=${live(this.checked)}
        .indeterminate=${this.controlIndeterminate}
        ?required=${this.required}
        ?disabled=${this.isDisabled}
        aria-readonly=${this.isReadOnly ? "true" : nothing}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @click=${this.handleClick}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
      ${this.renderIndicator()}
    `;
  }

  /** The control first, then the label, the hint and the error, aligned with the label. */
  override render() {
    return html`
      <div class="toggle${this.hasError ? " toggle--invalid" : ""}">
        <span class="control-area">${this.renderControl()}</span>
        <span class="text">${this.renderLabel()} ${this.renderHint()} ${this.renderError()}</span>
      </div>
    `;
  }

  /** For `renderControl()`: the `click` listener of the control. A read-only control keeps its state. */
  protected handleClick(event: MouseEvent): void {
    if (this.isReadOnly) {
      event.preventDefault();
    }
  }

  protected override handleInput(event: Event): void {
    this.checked = (event.target as HTMLInputElement).checked;
  }
}
