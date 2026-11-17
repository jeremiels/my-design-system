// A popover anchored below an element of its shadow root, in the top layer.
// Chromium anchors in CSS: the tests of the fallback stub CSS.supports() to
// take the path of Firefox before 147 and Safari before 26, where Floating UI
// positions it. src/polyfills/anchor-positioning.test.ts removes the Popover
// API.
import { html, LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnchoredPopoverController, anchoredPopoverStyles } from "./anchored-popover.js";

/** A constructed sheet: Lit's `css` tag isn't used in the base. */
function sheet(text: string) {
  const styles = new CSSStyleSheet();
  styles.replaceSync(text);
  return styles;
}

class Anchored extends LitElement {
  static styles = [
    anchoredPopoverStyles,
    sheet(`
      #popover {
        display: block;
        margin-block: 4px;
        inline-size: 10rem;
      }
    `),
  ];

  #popover = new AnchoredPopoverController(this);

  render() {
    return html`
      <button id="anchor" type="button">Anchor</button>
      <div id="popover" popover="manual">Popover</div>
    `;
  }

  get anchor() {
    return this.renderRoot.querySelector<HTMLElement>("#anchor")!;
  }

  get panel() {
    return this.renderRoot.querySelector<HTMLElement>("#popover")!;
  }

  open() {
    return this.#popover.open(this.panel, this.anchor);
  }

  close() {
    this.#popover.close(this.panel);
  }

  get isOpen() {
    return this.#popover.isOpen(this.panel);
  }
}
customElements.define("t-anchored", Anchored);

/** The next rendering: Floating UI updates after a scroll there. */
const frame = () => new Promise(requestAnimationFrame);

let host: Anchored;

async function mount(style = "") {
  host = new Anchored();
  host.setAttribute("style", style);
  document.body.append(host);
  await host.updateComplete;
  return host;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.body.removeAttribute("style");
  window.scrollTo(0, 0);
});

/** The checks of both paths: CSS anchor positioning, then Floating UI. */
function positions() {
  it("shows the popover in the top layer, below its anchor", async () => {
    await mount("position: absolute; top: 20px; left: 30px");
    expect(getComputedStyle(host.panel).display).toBe("none");

    await host.open();

    expect(host.panel.matches(":popover-open")).toBe(true);
    expect(host.panel.hasAttribute("data-open")).toBe(true);
    expect(host.isOpen).toBe(true);
    const anchor = host.anchor.getBoundingClientRect();
    const popover = host.panel.getBoundingClientRect();
    // Its block margin is the space between them.
    expect(popover.top).toBeCloseTo(anchor.bottom + 4, 0);
    expect(popover.left).toBeCloseTo(anchor.left, 0);
  });

  it("is at least as wide as its anchor", async () => {
    await mount("position: absolute; top: 20px; left: 30px");
    host.anchor.style.inlineSize = "20rem";

    await host.open();

    const anchor = host.anchor.getBoundingClientRect();
    expect(host.panel.getBoundingClientRect().width).toBeCloseTo(anchor.width, 0);
  });

  it("flips above its anchor when it would overflow the viewport", async () => {
    await mount("position: fixed; bottom: 10px; left: 30px");

    await host.open();

    const anchor = host.anchor.getBoundingClientRect();
    expect(host.panel.getBoundingClientRect().bottom).toBeCloseTo(anchor.top - 4, 0);
  });

  it("hides the popover at once", async () => {
    await mount();
    await host.open();

    host.close();

    expect(host.panel.matches(":popover-open")).toBe(false);
    expect(host.panel.hasAttribute("data-open")).toBe(false);
    expect(getComputedStyle(host.panel).display).toBe("none");
  });
}

describe("AnchoredPopoverController, with CSS anchor positioning", () => {
  positions();

  it("anchors through a name unique to each anchor", async () => {
    const first = await mount();
    const second = await mount();
    await Promise.all([first.open(), second.open()]);

    const names = [first, second].map((each) => each.anchor.style.getPropertyValue("anchor-name"));
    expect(names[0]).not.toBe(names[1]);
    expect(first.panel.style.getPropertyValue("position-anchor")).toBe(names[0]);
  });
});

describe("AnchoredPopoverController, positioned by Floating UI", () => {
  beforeEach(() => {
    vi.spyOn(CSS, "supports").mockReturnValue(false);
  });

  positions();

  it("follows its anchor when the page scrolls, until it closes", async () => {
    document.body.style.blockSize = "300vh";
    await mount("position: absolute; top: 200px; left: 30px");
    await host.open();

    window.scrollTo(0, 100);
    await frame();
    await frame();
    const anchor = host.anchor.getBoundingClientRect();
    expect(host.panel.getBoundingClientRect().top).toBeCloseTo(anchor.bottom + 4, 0);

    host.close();
    const top = host.panel.style.top;
    window.scrollTo(0, 150);
    await frame();
    await frame();
    expect(host.panel.style.top).toBe(top);
  });

  it("stays closed when closed while Floating UI loads", async () => {
    await mount();

    const opening = host.open();
    host.close();
    await opening;

    expect(host.panel.matches(":popover-open")).toBe(false);
    expect(host.panel.hasAttribute("data-open")).toBe(false);
  });
});
