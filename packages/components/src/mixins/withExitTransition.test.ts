// Where `overlay` is missing (Firefox, Safari), the element must transition
// out while it's still open: `closeWithTransition()` sets data-closing,
// waits for the element's own transitions, then closes it. Chromium has
// `overlay`: these tests stub CSS.supports() to take that path.
import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withExitTransition } from "./withExitTransition.js";

class Exit extends withExitTransition(LitElement) {
  close(element: HTMLElement, onClose: () => void) {
    return this.closeWithTransition(element, onClose);
  }

  cancel(element: HTMLElement) {
    this.cancelExitTransition(element);
  }
}
customElements.define("t-exit-transition", Exit);

const style = document.createElement("style");
style.textContent = `
  .panel { opacity: 1; transition: opacity 100ms linear; }
  .panel[data-closing] { opacity: 0; }
  .spinner { animation: t-spin 1s linear infinite; }
  @keyframes t-spin { to { rotate: 1turn; } }
`;

let host: Exit;
let panel: HTMLElement;

beforeEach(() => {
  document.head.append(style);
  host = new Exit();
  panel = document.createElement("div");
  panel.className = "panel";
  document.body.append(host, panel);
  // A transition needs a style to start from: the panel's first one.
  panel.getBoundingClientRect();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  style.remove();
});

describe("withExitTransition", () => {
  it("closes at once where the CSS animates the exit", async () => {
    vi.spyOn(CSS, "supports").mockReturnValue(true);
    const onClose = vi.fn();

    const closing = host.close(panel, onClose);

    expect(panel.hasAttribute("data-closing")).toBe(false);
    await closing;
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe("without overlay", () => {
    beforeEach(() => {
      vi.spyOn(CSS, "supports").mockReturnValue(false);
    });

    it("waits for the exit transition, then closes", async () => {
      const onClose = vi.fn();

      const closing = host.close(panel, onClose);

      expect(panel.hasAttribute("data-closing")).toBe(true);
      expect(onClose).not.toHaveBeenCalled();
      await closing;
      expect(onClose).toHaveBeenCalledOnce();
      expect(panel.hasAttribute("data-closing")).toBe(false);
    });

    it("closes at once without transition", async () => {
      panel.style.transition = "none";
      const onClose = vi.fn();

      await host.close(panel, onClose);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("ignores an endless animation in the content", async () => {
      const spinner = document.createElement("div");
      spinner.className = "spinner";
      panel.append(spinner);
      spinner.getBoundingClientRect();
      const onClose = vi.fn();
      const start = performance.now();

      await host.close(panel, onClose);

      expect(onClose).toHaveBeenCalledOnce();
      // The 100 ms transition, not the 2 s safeguard.
      expect(performance.now() - start).toBeLessThan(1000);
    });

    it("keeps the element open when the exit is canceled", async () => {
      const onClose = vi.fn();

      const closing = host.close(panel, onClose);
      host.cancel(panel);
      await closing;

      expect(onClose).not.toHaveBeenCalled();
      expect(panel.hasAttribute("data-closing")).toBe(false);
    });

    it("closes once, after the last exit, when closed again after a cancel", async () => {
      const onClose = vi.fn();

      const first = host.close(panel, onClose);
      host.cancel(panel);
      const second = host.close(panel, onClose);
      await Promise.all([first, second]);

      expect(onClose).toHaveBeenCalledOnce();
      expect(panel.hasAttribute("data-closing")).toBe(false);
    });
  });
});
