/**
 * Colors as CSS writes them, compared as people see them: the distance of
 * two colors in OKLab (ADR 0043). A raw color of a mockup or of a style sheet
 * finds the tokens nearest to it.
 */

/** A color in sRGB, each channel from 0 to 1. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly alpha: number;
}

/** The named colors a style sheet writes for a raw color. */
const NAMED: Readonly<Record<string, string>> = { white: "#ffffff", black: "#000000" };

/** A number of a color function: `50%` gives 0.5 of `scale`. */
function channel(text: string, scale: number): number {
  const value = Number.parseFloat(text);
  return text.trim().endsWith("%") ? (value / 100) * scale : value;
}

/** `hsl()`, as sRGB. */
function hslToRgb(hue: number, saturation: number, lightness: number) {
  const k = (n: number) => (n + hue / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n: number) => lightness - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: f(0), g: f(8), b: f(4) };
}

/**
 * A color of CSS: hexadecimal, `rgb()`, `hsl()`, `white` or `black`.
 * Undefined for anything else.
 */
export function parseColor(text: string): Rgb | undefined {
  const value = (NAMED[text.trim().toLowerCase()] ?? text).trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(value)?.[1];
  if (hex !== undefined) {
    if (![3, 4, 6, 8].includes(hex.length)) {
      return undefined;
    }
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join("") : hex;
    const byte = (index: number) => Number.parseInt(full.slice(index, index + 2), 16) / 255;
    return { r: byte(0), g: byte(2), b: byte(4), alpha: full.length === 8 ? byte(6) : 1 };
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(value);
  if (!fn) {
    return undefined;
  }
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) {
    return undefined;
  }
  const alpha = parts[3] === undefined ? 1 : channel(parts[3], 1);
  if (fn[1]!.startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map((part) => channel(part, 255) / 255);
    return { r: r!, g: g!, b: b!, alpha };
  }
  const rgb = hslToRgb(Number.parseFloat(parts[0]!), channel(parts[1]!, 1), channel(parts[2]!, 1));
  return { ...rgb, alpha };
}

/** sRGB to OKLab (Björn Ottosson). */
function oklab({ r, g, b }: Rgb): [number, number, number] {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * The distance of two colors in OKLab, times 100: under 2, people barely see
 * a difference. A difference of opacity counts too.
 */
export function colorDistance(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2, a.alpha - b.alpha) * 100;
}
