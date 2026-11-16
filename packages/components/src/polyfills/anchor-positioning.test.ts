// The oldest browsers of the matrix, in Chromium: this file removes the
// Popover API and stubs CSS anchor positioning before loading the mixin
// (Chrome 111–113, Firefox 115–124, Safari 16.4–16.x). Vitest runs each
// browser test file in its own iframe: the other files keep the native APIs.
// The popover isn't in the top layer: it's fixed above the page, and Floating
// UI positions it.
import { html, LitElement } from "lit";
import { afterEach, expect, it, vi } from "vitest";

Reflect.deleteProperty(HTMLElement.prototype, "popover");
vi.spyOn(CSS, "supports").mockReturnValue(false);

const { cssAnchors, supportsPopover } = await import("./anchor-positioning.js");
const { withAnchoredPopover } = await import("../mixins/withAnchoredPopover.js");

/** A constructed sheet: Lit's `css` tag isn't used in the base. */
function sheet(text: string) {
  const styles = new CSSStyleSheet();
  styles.replaceSync(text);
  return styles;
}

class Anchored extends withAnchoredPopover(LitElement) {
  static styles = [
    super.styles ?? [],
    sheet(`
      :host {
        --u-z-index-overlay: 7;
      }
      #popover {
        display: block;
        margin-block: 4px;
      }
    `),
  ];

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
    return this.openPopover(this.panel, this.anchor);
  }

  close() {
    this.closePopover(this.panel);
  }
}
customElements.define("t-anchored-without-popover", Anchored);

afterEach(() => {
  document.body.replaceChildren();
});

it("detects the missing APIs", () => {
  expect(supportsPopover()).toBe(false);
  expect(cssAnchors()).toBe(false);
});

it("fixes the popover above the page, below its anchor", async () => {
  const host = new Anchored();
  host.style.cssText = "position: absolute; top: 20px; left: 30px";
  document.body.append(host);
  await host.updateComplete;

  await host.open();

  // Shown by its attribute: the top layer doesn't exist here.
  expect(host.panel.matches(":popover-open")).toBe(false);
  const style = getComputedStyle(host.panel);
  expect(style.display).toBe("block");
  expect(style.position).toBe("fixed");
  expect(style.zIndex).toBe("7");
  const anchor = host.anchor.getBoundingClientRect();
  expect(host.panel.getBoundingClientRect().top).toBeCloseTo(anchor.bottom + 4, 0);

  host.close();
  expect(getComputedStyle(host.panel).display).toBe("none");
});

it("positions the popover in a transformed ancestor, its containing block", async () => {
  // As in the <dialog> of `modal`, scaled: a fixed element is positioned in it.
  const frame = document.createElement("div");
  frame.style.cssText = "position: absolute; top: 50px; left: 50px; scale: 1; padding: 20px";
  const host = new Anchored();
  frame.append(host);
  document.body.append(frame);
  await host.updateComplete;

  await host.open();

  const anchor = host.anchor.getBoundingClientRect();
  const popover = host.panel.getBoundingClientRect();
  expect(popover.top).toBeCloseTo(anchor.bottom + 4, 0);
  expect(popover.left).toBeCloseTo(anchor.left, 0);
});
