// Dates of a calendar, without a browser (ADR 0010).
import { describe, expect, it } from "vitest";
import {
  addMonths,
  calendarKeyMove,
  clampDate,
  dayOfWeek,
  formatDate,
  isWithin,
  monthWeeks,
  parseDate,
} from "./calendar.ts";

const date = (text: string) => parseDate(text)!;

describe("parseDate() and formatDate()", () => {
  it("read and write the format of HTML", () => {
    expect(parseDate("2026-11-21")).toEqual({ year: 2026, month: 11, day: 21 });
    expect(formatDate({ year: 26, month: 1, day: 5 })).toBe("0026-01-05");
  });

  it("refuse another format and an impossible date", () => {
    expect(parseDate("21/11/2026")).toBeUndefined();
    expect(parseDate("2026-02-30")).toBeUndefined();
    expect(parseDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

it("moves by months to the last day of a shorter month", () => {
  expect(formatDate(addMonths(date("2026-01-31"), 1))).toBe("2026-02-28");
  expect(formatDate(addMonths(date("2026-01-15"), -1))).toBe("2025-12-15");
  expect(formatDate(addMonths(date("2026-03-31"), -12))).toBe("2025-03-31");
});

it("knows the day of the week", () => {
  expect(dayOfWeek(date("2026-11-21"))).toBe(6);
});

it("keeps a date within its bounds", () => {
  const min = date("2026-11-10");
  const max = date("2026-11-20");
  expect(isWithin(date("2026-11-15"), min, max)).toBe(true);
  expect(isWithin(date("2026-11-21"), min, max)).toBe(false);
  expect(formatDate(clampDate(date("2026-11-21"), min, max))).toBe("2026-11-20");
  expect(isWithin(date("2026-11-21"))).toBe(true);
});

describe("monthWeeks()", () => {
  it("starts each week on the first day, empty cells around the month", () => {
    const weeks = monthWeeks(2026, 11, 1);
    // November 1, 2026 is a Sunday: the last day of a week that starts on Monday.
    expect(weeks[0]!.map((day) => day?.day)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1,
    ]);
    expect(weeks).toHaveLength(6);
    expect(weeks.at(-1)!.map((day) => day?.day)).toEqual([
      30,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("starts on Sunday when asked", () => {
    expect(monthWeeks(2026, 11, 0)[0]![0]).toEqual({ year: 2026, month: 11, day: 1 });
  });
});

describe("calendarKeyMove()", () => {
  const options = { firstDay: 1 };
  const move = (key: string, from: string, more = {}) =>
    formatDate(calendarKeyMove(key, date(from), { ...options, ...more })!);

  it("moves by a day along the text, and by a week", () => {
    expect(move("ArrowRight", "2026-11-30")).toBe("2026-12-01");
    expect(move("ArrowRight", "2026-11-21", { direction: "rtl" })).toBe("2026-11-20");
    expect(move("ArrowUp", "2026-11-03")).toBe("2026-10-27");
  });

  it("moves to the start and the end of the week", () => {
    expect(move("Home", "2026-11-21")).toBe("2026-11-16");
    expect(move("End", "2026-11-21")).toBe("2026-11-22");
    expect(move("Home", "2026-11-21", { firstDay: 0 })).toBe("2026-11-15");
  });

  it("moves by a month, or a year with Shift", () => {
    expect(move("PageDown", "2026-01-31")).toBe("2026-02-28");
    expect(move("PageUp", "2026-11-21", { shiftKey: true })).toBe("2025-11-21");
  });

  it("ignores another key", () => {
    expect(calendarKeyMove("Enter", date("2026-11-21"), options)).toBeUndefined();
  });
});
