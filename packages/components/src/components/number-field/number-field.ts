import { RangeFieldBase } from "../../bases/range-field/range-field-base.js";

/**
 * A number field: a label, an optional hint, a native `<input
 * type="number">` and its error message. The browser validates the number,
 * `min`, `max` and `step`, and its arrows and ArrowUp and ArrowDown step the
 * value. The value is the number as text, in the format of HTML (`3.5`), or
 * `""`. For a code made of digits (a postal code, a card number), use
 * `text-field` (ADR 0019).
 *
 * @element u-number-field
 * @summary A labelled number input that takes part in its form.
 * @csspart input - The native `<input type="number">`.
 */
export class NumberField extends RangeFieldBase {
  static override componentName = "number-field";

  protected renderControl() {
    return this.renderInput("number");
  }
}
