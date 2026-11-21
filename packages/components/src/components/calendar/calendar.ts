import chevronLeft from "@unicorne/icons/chevron-left";
import chevronRight from "@unicorne/icons/chevron-right";
import { nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import {
  addMonths,
  calendarKeyMove,
  clampDate,
  compareDates,
  formatDate,
  isWithin,
  monthWeeks,
  parseDate,
  type PlainDate,
} from "../../state/calendar.js";
import { DirectionController } from "../../controllers/direction.js";
import { Button } from "../button/button.js";
import { Icon } from "../icon/icon.js";
import calendarStyles from "./calendar.css" with { type: "css" };
import calendarTokens from "./calendar.tokens.css" with { type: "css" };

/** The first day of the week of a language, 0 for Sunday: Monday where the browser doesn't say. */
function firstDayOf(language: string | undefined): number {
  try {
    const locale = new Intl.Locale(
      language ?? Intl.DateTimeFormat().resolvedOptions().locale,
    ) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    return info ? info.firstDay % 7 : 1;
  } catch {
    return 1;
  }
}

/** Today, in the user's time zone. */
function today(): PlainDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** A date as a UTC instant, for `Intl.DateTimeFormat` with `timeZone: "UTC"`. */
const instant = ({ year, month, day }: PlainDate) => Date.UTC(year, month - 1, day);

/**
 * A calendar: the days of a month in a grid, to pick a date. It shows the
 * month of its `value`, or of today; the previous and next buttons, and the
 * keys, change the month. `date-picker` shows one in its popup (ADR 0023).
 *
 * The grid follows the ARIA date picker: one Tab stop, on the focused day;
 * the arrows move by a day or a week, along the text direction; Home and
 * End to the start and end of the week; PageUp and PageDown by a month, by a
 * year with Shift. Enter, Space and a click pick the focused day: `value`
 * takes it, and the calendar fires `change`.
 *
 * The names of the months and days, the full date of each day and the first
 * day of the week follow the language of the page (`lang`), through `Intl`.
 * A day outside `min` and `max` shows, but can't be picked.
 *
 * @element u-calendar
 * @summary The days of a month, to pick a date.
 * @csspart header - The header: the previous button, the month and year, the next button.
 * @csspart heading - The month and year, a polite live region.
 * @csspart previous - The button of the previous month: the `button` component of the same registration, `plain` and `neutral`.
 * @csspart next - The button of the next month, like `previous`.
 * @csspart grid - The grid of the days, `role="grid"`.
 * @csspart day - A day. The chosen one has `aria-selected="true"`, today `aria-current="date"`.
 * @fires change - When the user picks a day: `value` holds it.
 * @tokens calendar - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/calendar/`): `npm run analyze` documents them.
 */
export class Calendar extends DSBaseElement {
  static {
    // Its chevrons render at once, on a server too (ADR 0032).
    Icon.bundle({ "chevron-left": chevronLeft, "chevron-right": chevronRight });
  }

  static override componentName = "calendar";

  /** Renders its month buttons with the `button` of its own registration. */
  static override dependencies = [Button, Icon];

  static styles = [super.styles ?? [], calendarTokens, calendarStyles];

  /** The chosen date, `YYYY-MM-DD`, or `""`. */
  @property({ type: String })
  value = "";

  /** The first date that can be picked, `YYYY-MM-DD`. */
  @property({ type: String })
  min?: string;

  /** The last date that can be picked, `YYYY-MM-DD`. */
  @property({ type: String })
  max?: string;

  /** The accessible name of the previous button, in the page's language. */
  @property({ type: String, attribute: "previous-month-label" })
  previousMonthLabel = "Previous month";

  /** The accessible name of the next button, in the page's language. */
  @property({ type: String, attribute: "next-month-label" })
  nextMonthLabel = "Next month";

  /** The day the keys move from: its month shows. */
  @state()
  private focused: PlainDate = today();

  /** The text direction: the chevrons point back and forward along it. */
  #direction = new DirectionController(this);

  /** Gives the focus to the focused day of the grid. */
  override focus(options?: FocusOptions): void {
    this.#activeDay?.focus(options);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (
      changedProperties.has("value") ||
      changedProperties.has("min") ||
      changedProperties.has("max")
    ) {
      this.focused = clampDate(parseDate(this.value) ?? this.focused, this.#min, this.#max);
    }
  }

  get #min(): PlainDate | undefined {
    return this.min ? parseDate(this.min) : undefined;
  }

  get #max(): PlainDate | undefined {
    return this.max ? parseDate(this.max) : undefined;
  }

  get #activeDay(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part~="day"][tabindex="0"]') ?? null;
  }

  /** Moves the focus to `date`, within the bounds, its month shown. */
  async #focusDate(date: PlainDate): Promise<void> {
    this.focused = clampDate(date, this.#min, this.#max);
    await this.updateComplete;
    this.focus();
  }

  /** Picks `date` at the user's request: `value`, then `change`. */
  #pick(date: PlainDate): void {
    if (!isWithin(date, this.#min, this.#max)) {
      return;
    }
    this.focused = date;
    const value = formatDate(date);
    if (value !== this.value) {
      this.value = value;
      this.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  #onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#pick(this.focused);
      return;
    }
    const direction = getComputedStyle(this).direction === "rtl" ? "rtl" : "ltr";
    const next = calendarKeyMove(event.key, this.focused, {
      firstDay: firstDayOf(this.language),
      direction,
      shiftKey: event.shiftKey,
    });
    if (next) {
      event.preventDefault();
      void this.#focusDate(next);
    }
  };

  #onClick = (event: MouseEvent) => {
    const date = parseDate(
      (event.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date ?? "",
    );
    if (date) {
      this.#pick(date);
      void this.#focusDate(date);
    }
  };

  #moveMonth(months: number): void {
    this.focused = clampDate(addMonths(this.focused, months), this.#min, this.#max);
  }

  render() {
    const language = this.language;
    const firstDay = firstDayOf(language);
    const { year, month } = this.focused;
    const heading = new Intl.DateTimeFormat(language, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const weekday = (style: "short" | "long") =>
      new Intl.DateTimeFormat(language, { weekday: style, timeZone: "UTC" });
    const full = new Intl.DateTimeFormat(language, { dateStyle: "full", timeZone: "UTC" });
    // November 1, 2026 is a Sunday: the names of the days from it.
    const days = Array.from({ length: 7 }, (_, index) => ({
      year: 2026,
      month: 11,
      day: 1 + ((firstDay + index) % 7),
    }));
    const selected = parseDate(this.value);
    const button = this.tagFor(Button);
    const icon = this.tagFor(Icon);
    const now = today();
    const min = this.#min;
    const max = this.#max;
    const previousMonth = addMonths({ year, month, day: 1 }, -1);
    const nextMonth = addMonths({ year, month, day: 1 }, 1);
    const canGoBack =
      !min || previousMonth.year * 12 + previousMonth.month >= min.year * 12 + min.month;
    const canGoForward = !max || nextMonth.year * 12 + nextMonth.month <= max.year * 12 + max.month;
    return html`
      <div part="header" class="header">
        <${button}
          part="previous"
          class="nav nav--previous"
          variant="neutral"
          appearance="plain"
          label=${this.previousMonthLabel}
          ?disabled=${!canGoBack}
          @click=${() => this.#moveMonth(-1)}
        >
          <${icon} class="chevron" name="chevron-${this.#direction.side("start")}"></${icon}>
        </${button}>
        <span part="heading" class="heading" id="heading" aria-live="polite"
          >${heading.format(instant({ year, month, day: 1 }))}</span
        >
        <${button}
          part="next"
          class="nav nav--next"
          variant="neutral"
          appearance="plain"
          label=${this.nextMonthLabel}
          ?disabled=${!canGoForward}
          @click=${() => this.#moveMonth(1)}
        >
          <${icon} class="chevron" name="chevron-${this.#direction.side("end")}"></${icon}>
        </${button}>
      </div>
      <table
        part="grid"
        class="grid"
        role="grid"
        aria-labelledby="heading"
        @keydown=${this.#onKeydown}
        @click=${this.#onClick}
      >
        <thead>
          <tr>
            ${days.map(
              (day) =>
                html`<th scope="col" abbr=${weekday("long").format(instant(day))}>
                  ${weekday("short").format(instant(day))}
                </th>`,
            )}
          </tr>
        </thead>
        <tbody>
          ${monthWeeks(year, month, firstDay).map(
            (week) =>
              html`<tr>
                ${week.map((day) => {
                  if (!day) {
                    return html`<td></td>`;
                  }
                  const isFocused = compareDates(day, this.focused) === 0;
                  return html`<td
                    part="day"
                    class="day"
                    data-date=${formatDate(day)}
                    tabindex=${isFocused ? "0" : "-1"}
                    aria-label=${full.format(instant(day))}
                    aria-selected=${selected && compareDates(day, selected) === 0 ? "true" : "false"}
                    aria-current=${compareDates(day, now) === 0 ? "date" : nothing}
                    aria-disabled=${isWithin(day, min, max) ? nothing : "true"}
                  >
                    ${day.day}
                  </td>`;
                })}
              </tr>`,
          )}
        </tbody>
      </table>
    `;
  }
}
