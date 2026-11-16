import type { LitElement } from "lit";
import {
  cssAnchors,
  loadAnchorFallback,
  supportsPopover,
} from "../polyfills/anchor-positioning.js";
import type { AbstractConstructor, Constructor } from "../types/common.js";
import anchoredPopoverStyles from "./withAnchoredPopover.css" with { type: "css" };

type FloatingUI = Awaited<ReturnType<typeof loadAnchorFallback>>;

/** Set on the popover while it's open, in every browser: the CSS reads it. */
const open = "data-open";

/** Numbers the anchor names: one per anchor, unique in the page. */
let anchors = 0;

export declare class AnchoredPopoverInterface {
  /** Shows `popover` in the top layer, anchored below `anchor`. */
  protected openPopover(popover: HTMLElement, anchor: HTMLElement): Promise<void>;
  /** Hides `popover` at once. */
  protected closePopover(popover: HTMLElement): void;
}

/**
 * Mixin: shows a popover of the shadow root in the top layer, below an
 * element of the same shadow root, its anchor: the list of an autocomplete,
 * a menu, a tooltip.
 *
 * Each `[popover]` of the shadow root is a `popover="manual"`: the component
 * decides when it closes (Escape, a click outside, a choice). The mixin sets
 * `data-open` on it while it's open: the CSS writes its open state on
 * `[data-open]`, not on `:popover-open`, which the oldest browsers of the
 * matrix lack. With `withExitTransition`, the open state is
 * `[data-open]:where(:not([data-closing]))`.
 *
 * The popover sits below its anchor, aligned with its start edge, at least
 * as wide, and flips when it would overflow the viewport. Its block margin
 * is the space between them. Where CSS anchor positioning is missing, the
 * mixin loads Floating UI and positions it from script: the popover also
 * shrinks to the space left, down to its `max-block-size`. Without the
 * Popover API, there is no top layer: the popover is fixed above the page
 * (`--u-z-index-overlay`), and an ancestor that clips its overflow clips it.
 */
export function withAnchoredPopover<T extends AbstractConstructor<LitElement>>(Base: T) {
  abstract class AnchoredPopoverElement extends Base {
    static styles = [(Base as unknown as typeof LitElement).styles ?? [], anchoredPopoverStyles];

    /** The opening under way of each popover: a closing meanwhile cancels it. */
    #openings = new WeakMap<HTMLElement, object>();

    /** Stops the fallback's updates of each open popover. */
    #cleanups = new Map<HTMLElement, () => void>();

    /** The block margin of each popover: the fallback applies it as an offset. */
    #offsets = new WeakMap<HTMLElement, number>();

    connectedCallback(): void {
      super.connectedCallback();
      // Before the first opening: the popover appears once positioned.
      if (!cssAnchors()) {
        loadAnchorFallback().catch(() => {});
      }
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      for (const cleanup of this.#cleanups.values()) {
        cleanup();
      }
      this.#cleanups.clear();
    }

    /**
     * Shows `popover`, a `popover="manual"` of the shadow root, in the top
     * layer, anchored below `anchor`, an element of the same shadow root.
     * Resolves once it's shown and positioned. Already open, it only follows
     * the new anchor.
     */
    protected async openPopover(popover: HTMLElement, anchor: HTMLElement): Promise<void> {
      const opening = {};
      this.#openings.set(popover, opening);
      let floating: FloatingUI | undefined;
      if (cssAnchors()) {
        // Through inline styles: the anchor names are the mixin's business.
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
      popover.setAttribute(open, "");
      if (supportsPopover() && !popover.matches(":popover-open")) {
        popover.showPopover();
      }
      if (floating) {
        await this.#follow(floating, popover, anchor);
      }
    }

    /** Hides `popover` at once: its exit transition, if any, runs after. */
    protected closePopover(popover: HTMLElement): void {
      this.#openings.delete(popover);
      this.#cleanups.get(popover)?.();
      this.#cleanups.delete(popover);
      popover.removeAttribute(open);
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
      this.#cleanups.get(popover)?.();
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
        this.#cleanups.set(popover, autoUpdate(anchor, popover, update));
      });
    }
  }
  // Through `unknown`: protected members make the interface nominal.
  return AnchoredPopoverElement as unknown as Constructor<AnchoredPopoverInterface> & T;
}
