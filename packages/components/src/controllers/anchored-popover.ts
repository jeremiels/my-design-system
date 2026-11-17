import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
  cssAnchors,
  loadAnchorFallback,
  supportsPopover,
} from "../polyfills/anchor-positioning.js";
import anchoredPopoverStyles from "./anchored-popover.css" with { type: "css" };

type FloatingUI = Awaited<ReturnType<typeof loadAnchorFallback>>;

/** Set on the popover while it's open, in every browser: the CSS reads it. */
const openAttribute = "data-open";

/** Numbers the anchor names: one per anchor, unique in the page. */
let anchors = 0;

/**
 * The sheet of every component that creates an `AnchoredPopoverController`:
 * add it to `static styles`. A controller can't adopt a sheet itself.
 */
export { anchoredPopoverStyles };

/**
 * Reactive controller: shows a popover of the host's shadow root in the top
 * layer, below an element of the same shadow root, its anchor: the list of an
 * autocomplete, a menu, a tooltip (ADR 0009, D2).
 *
 * Each `[popover]` of the shadow root is a `popover="manual"`: the component
 * decides when it closes (Escape, a click outside, a choice). The controller
 * sets `data-open` on it while it's open: the CSS writes its open state on
 * `[data-open]`, not on `:popover-open`, which the oldest browsers of the
 * matrix lack. With an exit transition, the open state is
 * `[data-open]:where(:not([data-closing]))`.
 *
 * The popover sits below its anchor, aligned with its start edge, at least
 * as wide, and flips when it would overflow the viewport. Its block margin
 * is the space between them. Where CSS anchor positioning is missing, the
 * controller loads Floating UI and positions it from script: the popover also
 * shrinks to the space left, down to its `max-block-size`. Without the
 * Popover API, there is no top layer: the popover is fixed above the page
 * (`--u-z-index-overlay`), and an ancestor that clips its overflow clips it.
 *
 * Out of the document, a popover leaves the top layer: the controller closes
 * those it opened when the host disconnects.
 */
export class AnchoredPopoverController implements ReactiveController {
  /** The opening under way of each popover: a closing meanwhile cancels it. */
  #openings = new WeakMap<HTMLElement, object>();

  /** The open popovers, and what stops the fallback's updates of each. */
  #opened = new Map<HTMLElement, (() => void) | undefined>();

  /** The block margin of each popover: the fallback applies it as an offset. */
  #offsets = new WeakMap<HTMLElement, number>();

  constructor(host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    // Before the first opening: the popover appears once positioned.
    if (!cssAnchors()) {
      loadAnchorFallback().catch(() => {});
    }
  }

  hostDisconnected(): void {
    for (const popover of [...this.#opened.keys()]) {
      this.close(popover);
    }
  }

  /** Whether `popover` is open: shown, or about to be once positioned. */
  isOpen(popover: HTMLElement): boolean {
    return popover.hasAttribute(openAttribute);
  }

  /**
   * Shows `popover`, a `popover="manual"` of the shadow root, in the top
   * layer, anchored below `anchor`, an element of the same shadow root.
   * Resolves once it's shown and positioned. Already open, it only follows
   * the new anchor.
   */
  async open(popover: HTMLElement, anchor: HTMLElement): Promise<void> {
    const opening = {};
    this.#openings.set(popover, opening);
    let floating: FloatingUI | undefined;
    if (cssAnchors()) {
      // Through inline styles: the anchor names are the controller's business.
      const name = anchor.style.getPropertyValue("anchor-name") || `--u-anchor-${++anchors}`;
      anchor.style.setProperty("anchor-name", name);
      popover.style.setProperty("position-anchor", name);
    } else {
      floating = await loadAnchorFallback();
      if (this.#openings.get(popover) !== opening) {
        // Closed, or opened again, meanwhile.
        return;
      }
    }
    popover.setAttribute(openAttribute, "");
    this.#opened.set(popover, this.#opened.get(popover));
    if (supportsPopover() && !popover.matches(":popover-open")) {
      popover.showPopover();
    }
    if (floating) {
      await this.#follow(floating, popover, anchor);
    }
  }

  /** Hides `popover` at once: its exit transition, if any, runs before. */
  close(popover: HTMLElement): void {
    this.#openings.delete(popover);
    this.#opened.get(popover)?.();
    this.#opened.delete(popover);
    popover.removeAttribute(openAttribute);
    if (supportsPopover() && popover.matches(":popover-open")) {
      popover.hidePopover();
    }
  }

  /**
   * Positions `popover` with Floating UI, then again on each scroll,
   * resize or move of the anchor, until it closes. Resolves once
   * positioned: before the next paint, so it never shows unpositioned.
   */
  #follow(floating: FloatingUI, popover: HTMLElement, anchor: HTMLElement): Promise<void> {
    const { autoUpdate, computePosition, flip, offset, shift, size } = floating;
    if (!this.#offsets.has(popover)) {
      // Read once, before the inline margin sets it to zero.
      this.#offsets.set(popover, parseFloat(getComputedStyle(popover).marginBlockStart) || 0);
      popover.style.setProperty("margin", "0");
    }
    const gap = this.#offsets.get(popover)!;
    this.#opened.get(popover)?.();
    return new Promise((resolve) => {
      const update = () =>
        computePosition(anchor, popover, {
          // The top layer, or `position: fixed` without the Popover API.
          strategy: "fixed",
          placement: "bottom-start",
          middleware: [
            offset(gap),
            flip(),
            shift(),
            size({
              apply({ availableWidth, availableHeight, rects }) {
                popover.style.setProperty("min-inline-size", `${rects.reference.width}px`);
                popover.style.setProperty("max-inline-size", `${availableWidth}px`);
                popover.style.setProperty("max-block-size", `${availableHeight}px`);
              },
            }),
          ],
        }).then(({ x, y }) => {
          popover.style.setProperty("left", `${x}px`);
          popover.style.setProperty("top", `${y}px`);
          resolve();
        });
      // Runs `update` at once, then on each change.
      this.#opened.set(popover, autoUpdate(anchor, popover, update));
    });
  }
}
