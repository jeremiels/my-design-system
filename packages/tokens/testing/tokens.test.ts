// The default tokens are what every brand starts from: they must be
// accessible in both themes (WCAG AA, measured by the helper brands use). A
// container changes the brand or the theme of a zone of the page (ADR 0013):
// its values must reach the semantic tokens, and stop at the next container.
import { afterEach, describe, expect, it } from "vitest";
import { contrastFailures } from "./contrast.js";
import "../css/tokens.css";

/** The color `value` (e.g. `var(--u-color-action-background)`) computes to inside `parent`. */
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
  // A secondary palette as light as its text.
  container.style.setProperty("--u-palette-accent-600", "var(--u-palette-neutral-0)");
  document.body.append(container);

  const failures = contrastFailures(container);
  expect(failures.map(({ background }) => background)).toContain(
    "var(--u-color-secondary-background)",
  );
  for (const { foreground, ratio, minimum } of failures) {
    expect(foreground).toBe("var(--u-color-secondary-text)");
    expect(ratio).toBeLessThan(minimum);
  }
});

it("applies a theme scoped to a [data-brand] container to the semantic tokens", () => {
  const container = document.createElement("div");
  container.dataset.brand = "acme";
  container.style.setProperty("--u-palette-brand-600", "rgb(255, 0, 0)");
  document.body.append(container);

  expect(resolve("var(--u-color-action-background)", container)).toBe("rgb(255, 0, 0)");
  // Outside the container, the default theme still applies.
  expect(resolve("var(--u-color-action-background)")).not.toBe("rgb(255, 0, 0)");
});

it("gives the browser's own UI the theme of the page", () => {
  const scheme = () => getComputedStyle(document.documentElement).colorScheme;
  expect(scheme()).toBe("light dark");
  document.documentElement.dataset.theme = "dark";
  expect(scheme()).toBe("dark");
  document.documentElement.dataset.theme = "light";
  expect(scheme()).toBe("light");
});

it("gives the dark theme its own steps of the same palettes", () => {
  const light = resolve("var(--u-color-action-background)");
  document.documentElement.dataset.theme = "dark";
  expect(resolve("var(--u-color-action-background)")).toBe(resolve("var(--u-palette-brand-300)"));
  expect(resolve("var(--u-color-action-background)")).not.toBe(light);
});

/** A container in `parent`, with these data attributes. */
function zone(parent: Element, data: { theme?: string; brand?: string }): HTMLElement {
  const element = document.createElement("div");
  Object.assign(element.dataset, data);
  parent.append(element);
  return element;
}

describe("a theme zone (ADR 0013)", () => {
  const surface = (parent?: Element) => resolve("var(--u-color-surface-default)", parent);
  const lightSurface = () => resolve("var(--u-palette-neutral-0)");
  const darkSurface = () => resolve("var(--u-palette-neutral-950)");

  it("is dark in a light page, and light in a dark page", () => {
    document.documentElement.dataset.theme = "light";
    expect(surface(zone(document.body, { theme: "dark" }))).toBe(darkSurface());
    expect(surface()).toBe(lightSurface());

    document.documentElement.dataset.theme = "dark";
    expect(surface(zone(document.body, { theme: "light" }))).toBe(lightSurface());
    expect(surface()).toBe(darkSurface());
  });

  it("is accessible, whatever the theme of the page", () => {
    for (const [page, inner] of [
      ["light", "dark"],
      ["dark", "light"],
    ] as const) {
      document.documentElement.dataset.theme = page;
      expect(contrastFailures(zone(document.body, { theme: inner }))).toEqual([]);
    }
  });

  it("gives its theme to the brand containers inside it", () => {
    document.documentElement.dataset.theme = "light";
    const brand = zone(zone(document.body, { theme: "dark" }), { brand: "acme" });
    brand.style.setProperty("--u-palette-brand-300", "rgb(1, 2, 3)");
    // The dark step of the brand's own palette.
    expect(resolve("var(--u-color-action-background)", brand)).toBe("rgb(1, 2, 3)");
    expect(surface(brand)).toBe(darkSurface());
  });

  it("gives a brand container the theme of the nearest of two zones", () => {
    document.documentElement.dataset.theme = "dark";
    expect(surface(zone(zone(document.body, { theme: "light" }), { brand: "acme" }))).toBe(
      lightSurface(),
    );
    document.documentElement.dataset.theme = "light";
    expect(surface(zone(zone(document.body, { theme: "dark" }), { brand: "acme" }))).toBe(
      darkSurface(),
    );
  });

  it("lets a brand container have its own theme", () => {
    document.documentElement.dataset.theme = "dark";
    expect(surface(zone(document.body, { theme: "light", brand: "acme" }))).toBe(lightSurface());
    document.documentElement.dataset.theme = "light";
    expect(surface(zone(document.body, { theme: "dark", brand: "acme" }))).toBe(darkSurface());
  });

  it("gives the browser's own UI the theme of the zone", () => {
    document.documentElement.dataset.theme = "light";
    expect(getComputedStyle(zone(document.body, { theme: "dark" })).colorScheme).toBe("dark");
  });
});

it("starts a brand container again from the base's primitives, not from the brand around it", () => {
  const host = zone(document.body, { brand: "host" });
  host.style.setProperty("--u-palette-brand-600", "rgb(255, 0, 0)");
  const guest = zone(host, { brand: "guest" });

  expect(resolve("var(--u-color-action-background)", host)).toBe("rgb(255, 0, 0)");
  expect(resolve("var(--u-color-action-background)", guest)).toBe(
    resolve("var(--u-color-action-background)"),
  );
});
