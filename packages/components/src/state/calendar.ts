/**
 * Dates of a calendar, without DOM nor Lit (ADR 0010): plain dates in the
 * format of HTML, `YYYY-MM-DD`, with no time and no time zone, the grid of a
 * month, and the moves of the keys of a date grid (ARIA date picker).
 */

/** A day: a year, a month from 1 to 12, a day from 1. */
export interface PlainDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** The date of a `YYYY-MM-DD` text, or `undefined` for another text or an impossible date. */
export function parseDate(text: string): PlainDate | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return undefined;
  }
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
    ? { year, month, day }
    : undefined;
}

/** The `YYYY-MM-DD` text of a date. */
export function formatDate({ year, month, day }: PlainDate): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The number of days of a month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Negative when `a` comes before `b`, 0 on the same day, positive after. */
export function compareDates(a: PlainDate, b: PlainDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** The day of the week: 0 for Sunday, 6 for Saturday. */
export function dayOfWeek({ year, month, day }: PlainDate): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The date `days` later, or earlier when negative. */
export function addDays({ year, month, day }: PlainDate, days: number): PlainDate {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** The same day `months` later, or earlier: the last day of a shorter month. */
export function addMonths({ year, month, day }: PlainDate, months: number): PlainDate {
  const index = year * 12 + (month - 1) + months;
  const target = { year: Math.floor(index / 12), month: (index % 12) + 1 };
  return { ...target, day: Math.min(day, daysInMonth(target.year, target.month)) };
}

/** Whether `date` lies within `min` and `max`, either of them optional. */
export function isWithin(date: PlainDate, min?: PlainDate, max?: PlainDate): boolean {
  return (!min || compareDates(date, min) >= 0) && (!max || compareDates(date, max) <= 0);
}

/** `date` brought back within `min` and `max`. */
export function clampDate(date: PlainDate, min?: PlainDate, max?: PlainDate): PlainDate {
  if (min && compareDates(date, min) < 0) {
    return min;
  }
  return max && compareDates(date, max) > 0 ? max : date;
}

/**
 * The weeks of a month, from the week of its first day to the week of its
 * last, each starting on `firstDay` (0 for Sunday, 1 for Monday). A day of
 * an adjacent month is `undefined`: the grid leaves its cell empty.
 */
export function monthWeeks(
  year: number,
  month: number,
  firstDay: number,
): (PlainDate | undefined)[][] {
  const lead = (dayOfWeek({ year, month, day: 1 }) - firstDay + 7) % 7;
  const cells: (PlainDate | undefined)[] = Array.from({ length: lead }, () => undefined);
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    cells.push({ year, month, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push(undefined);
  }
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** What a key of a date grid needs to know. */
export interface CalendarKeyOptions {
  /** The first day of the week: 0 for Sunday, 1 for Monday. */
  firstDay: number;
  /** The direction of the text: ArrowLeft moves to the next day in `rtl`. */
  direction?: "ltr" | "rtl";
  /** Shift is down: PageUp and PageDown move by a year. */
  shiftKey?: boolean;
}

/**
 * The date a key moves the focus to, from `date`, as in the ARIA date
 * picker: the arrows by a day or a week, Home and End to the start or end
 * of the week, PageUp and PageDown by a month, or a year with Shift.
 * `undefined` for another key.
 */
export function calendarKeyMove(
  key: string,
  date: PlainDate,
  { firstDay, direction = "ltr", shiftKey = false }: CalendarKeyOptions,
): PlainDate | undefined {
  const forward = direction === "ltr" ? 1 : -1;
  switch (key) {
    case "ArrowRight":
      return addDays(date, forward);
    case "ArrowLeft":
      return addDays(date, -forward);
    case "ArrowDown":
      return addDays(date, 7);
    case "ArrowUp":
      return addDays(date, -7);
    case "Home":
      return addDays(date, -((dayOfWeek(date) - firstDay + 7) % 7));
    case "End":
      return addDays(date, 6 - ((dayOfWeek(date) - firstDay + 7) % 7));
    case "PageDown":
      return addMonths(date, shiftKey ? 12 : 1);
    case "PageUp":
      return addMonths(date, shiftKey ? -12 : -1);
    default:
      return undefined;
  }
}
