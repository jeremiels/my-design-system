import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import type { DSBaseElement } from "../../bases/base-element.js";
import { PickerBase } from "../../bases/picker/picker-base.js";
import { parseDate } from "../../state/calendar.js";
import { Calendar } from "../calendar/calendar.js";
import { Icon } from "../icon/icon.js";
import datePickerStyles from "./date-picker.css" with { type: "css" };
import datePickerTokens from "./date-picker.tokens.css" with { type: "css" };

/**
 * A date picker: a form field whose control shows a date, and opens a
 * `calendar` below it to pick another one. The value is in the format of
 * HTML, `YYYY-MM-DD`, or `""`. To type a date, use `date-field`. The label,
 * the hint, the error and the form behavior are those of `FieldBase`; the
 * control is that of `PickerBase` (ADR 0023).
 *
 * The control shows the date in the language of the page (`Intl`, `long`).
 * ArrowDown, Enter, Space and a click open the calendar, and give it the
 * focus, on the picked date or today. Its keys are those of the calendar.
 * A picked day closes it, fires `input` and `change`, and gives the focus
 * back to the control; so does Escape, without a change. Tab and a press
 * outside close it.
 *
 * @element u-date-picker
 * @summary A labelled field that picks a date in a calendar.
 * @csspart panel - The panel of the popup, a dialog around the calendar.
 * @csspart calendar - The `calendar` component of the same registration.
 * @tokens date-picker - Its panel's tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/date-picker/`): `npm run analyze` documents them.
 */
export class DatePicker extends PickerBase {
  static override componentName = "date-picker";

  /** Renders its calendar and its error icon with the components of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [Icon, Calendar];

  static styles = [super.styles ?? [], datePickerTokens, datePickerStyles];

  /** The first date that can be picked, `YYYY-MM-DD`. */
  @property({ type: String })
  min?: string;

  /** The last date that can be picked, `YYYY-MM-DD`. */
  @property({ type: String })
  max?: string;

  /** The accessible name of the calendar's previous button, in the page's language. */
  @property({ type: String, attribute: "previous-month-label" })
  previousMonthLabel = "Previous month";

  /** The accessible name of the calendar's next button, in the page's language. */
  @property({ type: String, attribute: "next-month-label" })
  nextMonthLabel = "Next month";

  protected override get popupRole(): "dialog" {
    return "dialog";
  }

  protected override get comboboxControls(): string {
    return "panel";
  }

  protected override get displayText(): string {
    const date = parseDate(this.value);
    if (!date) {
      return "";
    }
    return new Intl.DateTimeFormat(this.language, { dateStyle: "long", timeZone: "UTC" }).format(
      Date.UTC(date.year, date.month - 1, date.day),
    );
  }

  get #calendar(): Calendar | null {
    return this.renderRoot?.querySelector<Calendar>('[part~="calendar"]') ?? null;
  }

  /** The calendar opens on the picked date, or today: the entry doesn't change it. */
  protected openPicker(): void {
    this.showPopup("none");
  }

  protected override popupShown(): void {
    this.#calendar?.focus();
  }

  /** Closes the calendar: the focus comes back to the control if it was in the calendar. */
  protected override hidePopup(): void {
    const inside = this.#calendar?.matches(":focus-within") ?? false;
    super.hidePopup();
    if (inside) {
      this.control?.focus();
    }
  }

  /** The hidden native control whose message a missing date shows. */
  protected override renderValidityProxy(): unknown {
    return html`<input class="validity-proxy" type="date" required hidden tabindex="-1" />`;
  }

  /** A day picked in the calendar: the value, the closing, `input` and `change`. */
  #pick = (event: Event) => {
    const value = (event.target as Calendar).value;
    this.hidePopup();
    if (value === this.value) {
      return;
    }
    this.value = value;
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.handleChange();
  };

  protected renderPopup() {
    const calendar = this.tagFor(Calendar);
    return html`
      <div part="panel" class="panel" id="panel" role="dialog" aria-labelledby="label">
        <${calendar}
          part="calendar"
          .value=${this.value}
          .min=${this.min}
          .max=${this.max}
          previous-month-label=${this.previousMonthLabel}
          next-month-label=${this.nextMonthLabel}
          @change=${this.#pick}
        ></${calendar}>
      </div>
    `;
  }
}
