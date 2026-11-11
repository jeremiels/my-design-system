// The default tokens are what every brand starts from: they must be
// accessible in both themes (WCAG AA), and a theme scoped to a container must
// reach the semantic tokens (ADR 0001, D4: several brands on one page).
import { afterEach, describe, expect, it } from "vitest";
import "./main.css";

const INTENTS = ["action", "secondary", "success", "warning", "danger", "information"];
const STATES = ["", "-hover", "-active"];

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

/** The color `value` (e.g. `var(--u-color-action-bg)`) computes to inside `parent`. */
function resolve(value: string, parent: Element = document.body): string {
  const probe = document.createElement("div");
  probe.style.color = value;
  parent.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

afterEach(() => {
  delete document.documentElement.dataset.theme;
  document.body.replaceChildren();
});

describe.each(["light", "dark"])("%s theme", (theme) => {
  it.each(INTENTS.flatMap((intent) => STATES.map((state) => [intent, state])))(
    "--u-color-%s-bg%s has a 4.5:1 contrast with its text",
    (intent, state) => {
      document.documentElement.dataset.theme = theme;
      const background = resolve(`var(--u-color-${intent}-bg${state})`);
      const text = resolve(`var(--u-color-${intent}-text)`);
      expect(contrast(background, text)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("has a 3:1 contrast between the focus ring and the surface", () => {
    document.documentElement.dataset.theme = theme;
    const ring = resolve("var(--u-color-focus-ring)");
    const surface = resolve("var(--u-color-surface)");
    expect(contrast(ring, surface)).toBeGreaterThanOrEqual(3);
  });
});

it("applies a theme scoped to a [data-brand] container to the semantic tokens", () => {
  const container = document.createElement("div");
  container.dataset.brand = "acme";
  container.style.setProperty("--u-color-primary", "rgb(255, 0, 0)");
  document.body.append(container);

  expect(resolve("var(--u-color-action-bg)", container)).toBe("rgb(255, 0, 0)");
  // Outside the container, the default theme still applies.
  expect(resolve("var(--u-color-action-bg)")).not.toBe("rgb(255, 0, 0)");
});
