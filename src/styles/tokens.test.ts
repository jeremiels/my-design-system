// The default tokens are what every brand starts from: they must be
// accessible in both themes (WCAG AA, measured by the helper brands use), and
// a theme scoped to a container must reach the semantic tokens (ADR 0001, D4:
// several brands on one page).
import { afterEach, describe, expect, it } from "vitest";
import { contrastFailures } from "../testing/contrast.js";
import "./main.css";

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
  it("keeps every semantic color pair above its WCAG AA contrast", () => {
    document.documentElement.dataset.theme = theme;
    expect(contrastFailures()).toEqual([]);
  });
});

it("reports the pairs of a theme below their minimum contrast", () => {
  const container = document.createElement("div");
  container.dataset.brand = "acme";
  // A secondary color as light as its text.
  container.style.setProperty("--u-color-secondary", "var(--u-color-text-inverse)");
  document.body.append(container);

  const failures = contrastFailures(container);
  expect(failures.map(({ background }) => background)).toContain("var(--u-color-secondary-bg)");
  for (const { foreground, ratio, minimum } of failures) {
    expect(foreground).toBe("var(--u-color-secondary-text)");
    expect(ratio).toBeLessThan(minimum);
  }
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
