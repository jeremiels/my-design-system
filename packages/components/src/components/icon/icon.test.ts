import { icons, type IconSet } from "@unicorne/icons";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponents } from "../../registry/define-components.js";
import { Icon } from "./icon.js";

// The custom element registry is global to the page: every test registers
// under its own prefix.
let count = 0;

/** Registers an icon component with this set, and returns its tag. */
function iconWith(icons: IconSet): string {
  const prefix = `icontest${++count}`;
  class TestIcon extends Icon {
    static override icons = icons;
  }
  defineComponents({ prefix, components: [TestIcon] });
  return `${prefix}-icon`;
}

function create(tag: string, name: string, label?: string): Icon {
  const icon = document.createElement(tag) as Icon;
  icon.name = name;
  if (label) {
    icon.label = label;
  }
  document.body.append(icon);
  return icon;
}

const box = (icon: Icon) => icon.shadowRoot!.querySelector('[part~="icon"]')!;
const SVG = '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("Icon", () => {
  it("loads an icon the first time it renders, then renders it at once", async () => {
    const loader = vi.fn(async () => ({ default: SVG }));
    const tag = iconWith({ star: loader });

    const first = create(tag, "star");
    await first.updateComplete;
    expect(box(first).innerHTML).toContain("<svg");

    // Loaded on the page: the next element has it from its first render.
    const second = create(tag, "star");
    await new Promise(requestAnimationFrame);
    expect(box(second).querySelector("svg")).not.toBeNull();
    expect(loader).toHaveBeenCalledOnce();
  });

  it("parses an icon once, whatever the number of elements that show it", async () => {
    const tag = iconWith({ star: SVG, heart: '<svg id="heart" viewBox="0 0 24 24"></svg>' });
    // The template of the element itself is parsed by the first one.
    await create(tag, "star").updateComplete;

    const createElement = document.createElement.bind(document);
    const parsed = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string, options?: ElementCreationOptions) =>
        createElement(tagName, options),
      );
    const hearts = [create(tag, "heart"), create(tag, "heart"), create(tag, "heart")];
    await Promise.all(hearts.map((icon) => icon.updateComplete));

    expect(parsed.mock.calls.filter(([tagName]) => tagName === "template")).toHaveLength(1);
    for (const icon of hearts) {
      expect(box(icon).querySelector("svg")?.id).toBe("heart");
    }
  });

  it("renders a string source at once", async () => {
    const icon = create(iconWith({ star: SVG }), "star");
    await new Promise(requestAnimationFrame);
    expect(box(icon).querySelector("svg")).not.toBeNull();
  });

  it("keeps its size while the icon loads", async () => {
    let resolve!: (module: { default: string }) => void;
    const icon = create(iconWith({ star: () => new Promise((r) => (resolve = r)) }), "star");
    await new Promise(requestAnimationFrame);

    // This page has no token sheet: the application's value of the token.
    icon.style.setProperty("--u-icon-size", "24px");
    expect(box(icon).querySelector("svg")).toBeNull();
    expect(icon.getBoundingClientRect()).toMatchObject({ width: 24, height: 24 });
    resolve({ default: SVG });
    await icon.updateComplete;
    expect(box(icon).querySelector("svg")).not.toBeNull();
  });

  it("renders the current name when an earlier load settles last", async () => {
    let resolveSlow!: (module: { default: string }) => void;
    const tag = iconWith({
      slow: () => new Promise((r) => (resolveSlow = r)),
      fast: async () => ({ default: '<svg id="fast"></svg>' }),
    });
    const icon = create(tag, "slow");
    await new Promise(requestAnimationFrame);
    icon.name = "fast";
    await icon.updateComplete;
    resolveSlow({ default: '<svg id="slow"></svg>' });
    await icon.updateComplete;

    expect(box(icon).querySelector("svg")?.id).toBe("fast");
  });

  it("is decorative without a label, an image with one", async () => {
    const tag = iconWith({ star: SVG });
    const decorative = create(tag, "star");
    const labelled = create(tag, "star", "Favorite");
    await Promise.all([decorative.updateComplete, labelled.updateComplete]);

    expect(box(decorative).getAttribute("aria-hidden")).toBe("true");
    expect(box(decorative).getAttribute("role")).toBeNull();
    expect(box(labelled).getAttribute("role")).toBe("img");
    expect(box(labelled).getAttribute("aria-label")).toBe("Favorite");
    expect(box(labelled).hasAttribute("aria-hidden")).toBe(false);
  });

  it("renders empty, with one warning, for a name missing from its set", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tag = iconWith({ star: SVG });
    const icons = [create(tag, "nope"), create(tag, "nope"), create(tag, "toString")];
    await Promise.all(icons.map((icon) => icon.updateComplete));

    for (const icon of icons) {
      expect(box(icon).childElementCount).toBe(0);
    }
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      `no icon "nope" in the set of <${tag}>; it renders empty.`,
      `no icon "toString" in the set of <${tag}>; it renders empty.`,
    ]);
  });

  it("renders empty, with a warning, when the icon fails to load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const icon = create(iconWith({ broken: () => Promise.reject(new Error("offline")) }), "broken");
    await icon.updateComplete;

    expect(box(icon).childElementCount).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("offline");
  });

  it("renders at once the markup a component bundled for an icon of the base, not a brand's", async () => {
    const BUNDLED = '<svg viewBox="0 0 24 24"><path d="M0 12h24"/></svg>';
    Icon.bundle({ "chevron-up": BUNDLED });
    const base = create(iconWith(icons), "chevron-up");
    // No load: the first render has the markup.
    await base.updateComplete;
    expect(box(base).innerHTML).toContain('d="M0 12h24"');

    // A brand's icon of the same name wins.
    const brand = create(iconWith({ ...icons, "chevron-up": SVG }), "chevron-up");
    await brand.updateComplete;
    expect(box(brand).innerHTML).toContain('d="M0 0h24"');
  });

  it("loads the icons of the base on demand", () => {
    for (const source of Object.values(Icon.icons)) {
      expect(typeof source).toBe("function");
    }
  });
});
