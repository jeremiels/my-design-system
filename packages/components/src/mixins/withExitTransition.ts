import type { LitElement } from "lit";
import type { AbstractConstructor, Constructor } from "../types/common.js";

/** Set while the element transitions out, in the browsers that need it. */
const closing = "data-closing";

/** Longest wait for the exit transition: a safeguard if it never ends. */
const exitTimeout = 2000;

/**
 * The exit under way of each element. Reopened then closed again, an element
 * has a new exit: the first one's wait ends early (its transitions are
 * canceled) and must not close it.
 */
const exits = new WeakMap<HTMLElement, object>();

/**
 * Chrome and Edge 117: `overlay` keeps the element in the top layer during
 * its exit, and `display` transitions with it, so the CSS animates the exit
 * after the closing. Firefox and Safari lack `overlay`: the element leaves
 * the top layer at once. Read at each closing, so tests can stub it.
 */
function cssAnimatesExit(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("overlay", "auto");
}

export declare class ExitTransitionInterface {
  /** Closes `element` once its exit transition ends. */
  protected closeWithTransition(element: HTMLElement, close: () => void): Promise<void>;
  /** Stops an exit transition under way: `element` stays open. */
  protected cancelExitTransition(element: HTMLElement): void;
}

/**
 * Mixin: animates the exit of a top-layer element of the shadow root, a
 * `<dialog>` or a popover, in every browser.
 *
 * The component's CSS writes the transition: the closed state on the
 * element, the open state on `[open]` or `:popover-open` followed by
 * `:where(:not([data-closing]))`, the entry in `@starting-style`, and
 * `display` and `overlay` among the transitioned properties. Where `overlay`
 * is missing, `closeWithTransition()` sets `data-closing` first: the element
 * reaches its closed state in the top layer, then closes.
 */
export function withExitTransition<T extends AbstractConstructor<LitElement>>(Base: T) {
  abstract class ExitTransitionElement extends Base {
    /**
     * Closes `element` once its exit transition ends: `close` closes it
     * (`dialog.close()`, `hidePopover()`). Without transition, as with
     * reduced motion, it closes at once. Resolves when closed, or when
     * `cancelExitTransition()` kept it open.
     */
    protected async closeWithTransition(element: HTMLElement, close: () => void): Promise<void> {
      if (!cssAnimatesExit()) {
        const exit = {};
        exits.set(element, exit);
        element.setAttribute(closing, "");
        // getAnimations() updates the style first: the transitions that
        // data-closing starts are there. Only the element's own, its
        // ::backdrop included, and finite: not a spinner in its content.
        const animations = element.getAnimations({ subtree: true }).filter((animation) => {
          const effect = animation.effect as KeyframeEffect | null;
          return effect?.target === element && effect.getComputedTiming().endTime !== Infinity;
        });
        if (animations.length > 0) {
          await Promise.race([
            Promise.allSettled(animations.map((animation) => animation.finished)),
            new Promise((resolve) => setTimeout(resolve, exitTimeout)),
          ]);
        }
        if (exits.get(element) !== exit) {
          // Reopened meanwhile, or closing again.
          return;
        }
        exits.delete(element);
        element.removeAttribute(closing);
      }
      close();
    }

    protected cancelExitTransition(element: HTMLElement): void {
      exits.delete(element);
      element.removeAttribute(closing);
    }
  }
  // Through `unknown`: protected members make the interface nominal.
  return ExitTransitionElement as unknown as Constructor<ExitTransitionInterface> & T;
}
