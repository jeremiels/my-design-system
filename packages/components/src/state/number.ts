/**
 * Formatted numbers, without DOM nor Lit (ADR 0010, ADR 0036): what a
 * `number-field` with `formatOptions` shows, what the user edits, and the
 * number it reads back, in the language of the page.
 */

/** The decimal and the group separators of a language. */
function separatorsOf(language: string | undefined): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(language).formatToParts(12345.6);
  return {
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    group: parts.find((part) => part.type === "group")?.value ?? ",",
  };
}

/** Whether `options` show a percentage: the number shows a hundred times larger. */
const percent = (options: Intl.NumberFormatOptions | undefined) => options?.style === "percent";

/**
 * The number `value`, in the format of HTML (`"1250.5"`), as `options` show
 * it in `language`: `"1 250,50 €"`. `""` for `""`, the text itself for a
 * text that isn't a number.
 */
export function formatNumber(
  value: string,
  language: string | undefined,
  options: Intl.NumberFormatOptions | undefined,
): string {
  const number = value.trim() === "" ? Number.NaN : Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(language, options).format(number) : value;
}

/**
 * The text the user edits: the number in `language`, without groups nor
 * symbols, a percentage times a hundred: `"1250,5"`, `"25"` for 25 %.
 */
export function editableNumber(
  value: string,
  language: string | undefined,
  options: Intl.NumberFormatOptions | undefined,
): string {
  const number = value.trim() === "" ? Number.NaN : Number(value);
  if (!Number.isFinite(number)) {
    return value;
  }
  return new Intl.NumberFormat(language, {
    useGrouping: false,
    maximumFractionDigits: 20,
  }).format(percent(options) ? Math.round(number * 100 * 1e12) / 1e12 : number);
}

/**
 * The number a user wrote in `language`, in the format of HTML: `"1250.5"`
 * for `"1 250,50 €"`. `""` for an empty text, `undefined` for a text that
 * isn't a number. A percentage reads a hundred times smaller.
 */
export function parseNumber(
  text: string,
  language: string | undefined,
  options: Intl.NumberFormatOptions | undefined,
): string | undefined {
  const { decimal, group } = separatorsOf(language);
  // The groups, the spaces of every kind, and the symbols go: a currency, a
  // percent sign, a unit. A point also reads as a decimal separator.
  let cleaned = text.replace(/[\s  ]/g, "");
  if (group.trim() !== "") {
    cleaned = cleaned.split(group).join("");
  }
  cleaned = cleaned
    .split(decimal)
    .join(".")
    .replace(/[−–]/g, "-")
    .replace(/[^\d.+-]/g, "");
  if (cleaned === "") {
    return text.trim() === "" ? "" : undefined;
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) {
    return undefined;
  }
  const number = Number(cleaned) / (percent(options) ? 100 : 1);
  return Number.isFinite(number) ? String(Math.round(number * 1e12) / 1e12) : undefined;
}

/** What stepping a number needs: the bounds and the step, as on a native input. */
export interface NumberBounds {
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
}

/**
 * The value after one step up (`1`) or down (`-1`), within the bounds and on
 * the step from `min`, as ArrowUp and ArrowDown do on a native number input.
 * From an empty value, the first step gives `min`, or else 0.
 */
export function stepNumber(value: string, direction: 1 | -1, bounds: NumberBounds): string {
  const min = bounds.min !== undefined && bounds.min !== "" ? Number(bounds.min) : undefined;
  const max = bounds.max !== undefined && bounds.max !== "" ? Number(bounds.max) : undefined;
  const any = bounds.step === "any" || !(Number(bounds.step) > 0);
  const step = any ? 1 : Number(bounds.step);
  const current = value.trim() === "" ? Number.NaN : Number(value);
  let next: number;
  if (!Number.isFinite(current)) {
    next = min ?? 0;
  } else if (any && bounds.step === "any") {
    // Any value: one unit further, without a grid.
    next = current + direction;
  } else {
    // Onto the grid of the step from `min` first, then one step further.
    const base = min ?? 0;
    const steps = (current - base) / step;
    const whole = Math.abs(steps - Math.round(steps)) < 1e-9;
    const target = whole
      ? Math.round(steps) + direction
      : direction > 0
        ? Math.ceil(steps)
        : Math.floor(steps);
    next = base + target * step;
  }
  if (min !== undefined && next < min) {
    next = min;
  }
  if (max !== undefined && next > max) {
    next = max;
  }
  return String(Math.round(next * 1e12) / 1e12);
}
