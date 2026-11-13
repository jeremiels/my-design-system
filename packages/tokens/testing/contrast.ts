/**
 * WCAG AA contrast of a theme: the base's default tokens pass it
 * (`testing/tokens.test.ts`), and a brand that changes the colors must
 * keep passing it, in both themes. Runs in a browser, on computed colors:
 *
 * ```ts
 * import { contrastFailures } from "@unicorne/tokens/testing";
 *
 * for (const theme of ["light", "dark"]) {
 *   document.documentElement.dataset.theme = theme;
 *   expect(contrastFailures()).toEqual([]);
 * }
 * ```
 */

/** Two colors that must keep a minimum contrast ratio. */
export interface ContrastPair {
  /** The text or focus indicator color, as CSS: `var(--u-color-action-text)`. */
  foreground: string;
  /** The color it's drawn on. */
  background: string;
  /** The minimum ratio: 4.5 for text, 3 for a focus indicator (WCAG AA). */
  minimum: number;
}

/** A pair below its minimum, with the ratio measured. */
export interface ContrastFailure extends ContrastPair {
  ratio: number;
}

const INTENTS = ["action", "secondary", "success", "warning", "danger", "information"];
const STATES = ["", "-hover", "-active"];
const SURFACES = ["var(--u-color-surface-default)", "var(--u-color-surface-raised)"];

/** The semantic color pairs the base's components draw, with the contrast each needs. */
export const contrastPairs: readonly ContrastPair[] = [
  ...INTENTS.flatMap((intent) =>
    STATES.map((state) => ({
      foreground: `var(--u-color-${intent}-text)`,
      background: `var(--u-color-${intent}-background${state})`,
      minimum: 4.5,
    })),
  ),
  ...SURFACES.map((background) => ({
    foreground: "var(--u-color-text-default)",
    background,
    minimum: 4.5,
  })),
  ...SURFACES.map((background) => ({
    foreground: "var(--u-color-focus-ring)",
    background,
    minimum: 3,
  })),
];

/**
 * The pairs below their minimum, with the colors computed inside `element`
 * (a `[data-brand]` container, for a theme scoped to one) in the current
 * theme: an empty array when the theme is accessible. A brand's own
 * components add their pairs: `contrastFailures(element, [...contrastPairs, …])`.
 */
export function contrastFailures(
  element: Element = document.body,
  pairs: readonly ContrastPair[] = contrastPairs,
): ContrastFailure[] {
  return pairs
    .map((pair) => ({
      ...pair,
      ratio: contrast(resolve(pair.foreground, element), resolve(pair.background, element)),
    }))
    .filter(({ ratio, minimum }) => ratio < minimum);
}

/** The color `value` (e.g. `var(--u-color-action-background)`) computes to inside `element`. */
function resolve(value: string, element: Element): string {
  const probe = document.createElement("div");
  probe.style.color = value;
  element.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/** sRGB channels of any color the browser can compute, `oklch()` included. */
function channels(color: string): number[] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
}

function luminance(color: string): number {
  const [r, g, b] = channels(color).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
