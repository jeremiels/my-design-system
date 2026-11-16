/**
 * CSS anchor positioning (`position-area`, `position-try-fallbacks`): Chrome
 * and Edge 129, Firefox 147, Safari 26. The Popover API: Chrome and Edge 114,
 * Firefox 125, Safari 17. The older browsers of the matrix get Floating UI,
 * loaded on first use by `withAnchoredPopover`: an application whose
 * browsers anchor in CSS never downloads it (ADR 0009).
 *
 * Read at each call, so tests can stub `CSS.supports()` or mock this module.
 */
type FloatingUI = typeof import("@floating-ui/dom");

/** Whether the browser positions an element against an anchor in CSS. */
export function cssAnchors(): boolean {
  return (
    typeof CSS !== "undefined" &&
    CSS.supports("position-area", "block-end") &&
    CSS.supports("position-try-fallbacks", "flip-block")
  );
}

/** Whether the Popover API exists: a popover reaches the top layer. */
export function supportsPopover(): boolean {
  return typeof HTMLElement !== "undefined" && Object.hasOwn(HTMLElement.prototype, "popover");
}

let loading: Promise<FloatingUI> | undefined;

/** Loads Floating UI once. Call it only where `cssAnchors()` is false. */
export function loadAnchorFallback(): Promise<FloatingUI> {
  loading ??= import("@floating-ui/dom").catch((error: unknown) => {
    // Let the next opening try again.
    loading = undefined;
    throw error;
  });
  return loading;
}
