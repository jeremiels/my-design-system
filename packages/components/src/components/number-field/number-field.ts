import { html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { fieldIds } from "../../bases/field/field-base.js";
import { RangeFieldBase } from "../../bases/range-field/range-field-base.js";
import { editableNumber, formatNumber, parseNumber, stepNumber } from "../../state/number.js";

/**
 * A number field: a label, an optional hint, a native `<input
 * type="number">` and its error message. The browser validates the number,
 * `min`, `max` and `step`, and its arrows and ArrowUp and ArrowDown step the
 * value. The value is the number as text, in the format of HTML (`3.5`), or
 * `""`. For a code made of digits (a postal code, a card number), use
 * `text-field` (ADR 0019).
 *
 * With `formatOptions`, the field shows its number formatted in the
 * language of the page, `1 250,50 €`, while it doesn't have the focus
 * (ADR 0036). With the focus, the user edits the number alone, `1250,5`,
 * and writes it in the language of the page; a pasted `1 250,50 €` reads
 * too. The control is then a text input with `role="spinbutton"`:
 * ArrowUp and ArrowDown step the value, and a hidden native number input
 * gives the browser's validation of `min`, `max` and `step`. The value
 * stays in the format of HTML.
 *
 * @element u-number-field
 * @summary A labelled number input that takes part in its form.
 * @csspart input - The native `<input type="number">`, or the text input of a formatted number.
 */
export class NumberField extends RangeFieldBase {
  static override componentName = "number-field";

  /**
   * How the number shows while the field doesn't have the focus, as the
   * options of `Intl.NumberFormat`, in the language of the page:
   * `{ style: "currency", currency: "EUR" }`, `{ style: "percent" }`,
   * `{ style: "unit", unit: "kilometer" }`. A percentage is a fraction:
   * `0.25` shows `25 %`. Property only.
   */
  @property({ attribute: false })
  formatOptions?: Intl.NumberFormatOptions;

  /** The message of a text that isn't a number, with `formatOptions`, in the page's language. Property only. */
  @property({ attribute: false })
  badInputMessage: (text: string) => string = (text) => `“${text}” isn't a number.`;

  /** Whether the user edits the number: it shows without its format. */
  @state()
  private editing = false;

  /** The text the user writes, while editing, or a text that isn't a number. */
  #text = "";

  /** Whether the text isn't a number: the value is then `""`, as in a native number input. */
  #badInput = false;

  protected renderControl() {
    return this.formatOptions ? this.#renderFormatted() : this.renderInput("number");
  }

  #renderFormatted() {
    const language = this.language;
    const formatted = formatNumber(this.value, language, this.formatOptions);
    const number = this.value === "" ? undefined : Number(this.value);
    return html`
      <input
        part="input"
        class="control"
        id=${fieldIds.control}
        type="text"
        inputmode="decimal"
        role="spinbutton"
        .value=${live(this.editing || this.#badInput ? this.#text : formatted)}
        aria-valuenow=${ifDefined(number)}
        aria-valuemin=${ifDefined(this.min)}
        aria-valuemax=${ifDefined(this.max)}
        aria-valuetext=${this.value === "" ? nothing : formatted}
        ?required=${this.required}
        ?readonly=${this.readOnly}
        ?disabled=${this.isDisabled}
        autocomplete=${ifDefined(this.autocomplete)}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @focus=${this.#onFocus}
        @blur=${this.#onBlur}
        @input=${this.#onInput}
        @change=${this.handleChange}
        @keydown=${this.#onKeydown}
      />
      <!-- The browser's validation of the number, its bounds and its step. -->
      <input
        class="validity-proxy"
        type="number"
        hidden
        tabindex="-1"
        .value=${live(this.value)}
        min=${ifDefined(this.min)}
        max=${ifDefined(this.max)}
        step=${ifDefined(this.step)}
        ?required=${this.required}
      />
    `;
  }

  #onFocus = () => {
    if (!this.#badInput) {
      this.#text = editableNumber(this.value, this.language, this.formatOptions);
    }
    this.editing = true;
  };

  #onBlur = () => {
    this.editing = false;
  };

  #onInput = (event: Event) => {
    this.#text = (event.target as HTMLInputElement).value;
    const parsed = parseNumber(this.#text, this.language, this.formatOptions);
    this.#badInput = parsed === undefined;
    this.value = parsed ?? "";
    // `value` may stay "" while the text changes: the validity follows.
    this.requestUpdate();
  };

  /** ArrowUp and ArrowDown step the value, as on a native number input; Enter submits. */
  #onKeydown = (event: KeyboardEvent) => {
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && !this.readOnly) {
      event.preventDefault();
      this.value = stepNumber(this.value, event.key === "ArrowUp" ? 1 : -1, this);
      this.#badInput = false;
      this.#text = editableNumber(this.value, this.language, this.formatOptions);
      this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      this.handleChange();
    } else {
      this.submitOnEnter(event);
    }
  };

  /** With `formatOptions`: the validity of the hidden number input, or of a text that isn't a number. */
  protected override syncValidity(): void {
    if (!this.formatOptions) {
      super.syncValidity();
      return;
    }
    const internals = this.internals;
    const control = this.renderRoot.querySelector<HTMLInputElement>(`#${fieldIds.control}`);
    const proxy = this.renderRoot.querySelector<HTMLInputElement>(".validity-proxy");
    if (!internals || !control || !proxy) {
      return;
    }
    if (this.readOnly) {
      internals.setValidity({});
    } else if (this.customValidity) {
      internals.setValidity({ customError: true }, this.customValidity, control);
    } else if (this.#badInput) {
      internals.setValidity(
        { badInput: true },
        this.errorMessage || this.badInputMessage(this.#text),
        control,
      );
    } else if (proxy.validity.valid) {
      internals.setValidity({});
    } else {
      internals.setValidity(
        proxy.validity,
        this.errorMessage || proxy.validationMessage || this.errorLabel,
        control,
      );
    }
  }
}
