import { RangeFieldBase } from "../../bases/range-field/range-field-base.js";

/**
 * A date field: a label, an optional hint, a native `<input type="date">`
 * and its error message. The browser shows the date in the user's format,
 * offers its own calendar, and validates `min`, `max` and `step`. The value
 * is in the format of HTML, `YYYY-MM-DD`, or `""` (ADR 0019).
 *
 * @element u-date-field
 * @summary A labelled date input that takes part in its form.
 * @csspart input - The native `<input type="date">`.
 */
export class DateField extends RangeFieldBase {
  static override componentName = "date-field";

  protected renderControl() {
    return this.renderInput("date");
  }
}
