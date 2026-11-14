/**
 * Invoker Commands (`<button commandfor command>`): Chrome and Edge 135,
 * Firefox 144, Safari 26.2. The older browsers of the matrix get
 * invokers-polyfill, loaded on first use by `withInvoker` and `withCommands`:
 * an application that sends no command never downloads it.
 *
 * Its `fn` entry: the main one applies itself on import, and its types
 * redeclare `HTMLButtonElement.commandForElement`, which clashes with lib.dom.
 */
const inBrowser = typeof HTMLButtonElement !== "undefined";

/** The browser's own Invoker Commands, not the polyfill's: read before any loading. */
export const nativeInvokers = inBrowser && "commandForElement" in HTMLButtonElement.prototype;

let loading: Promise<void> | undefined;

/**
 * Whether `HTMLButtonElement.commandForElement` exists, native or polyfilled.
 * Never assign it before: an own property would hide the polyfill's accessor
 * for good, as with `popover`.
 */
export function invokersReady(): boolean {
  return inBrowser && "commandForElement" in HTMLButtonElement.prototype;
}

/** Loads the polyfill once, where Invoker Commands are missing. Resolves at once elsewhere. */
export function loadInvokers(): Promise<void> {
  if (!inBrowser || nativeInvokers) {
    return Promise.resolve();
  }
  loading ??= import("invokers-polyfill/fn").then(
    ({ apply, isSupported }) => {
      // The application may have loaded it already.
      if (!isSupported()) {
        apply();
      }
    },
    (error: unknown) => {
      // Let the next component try again.
      loading = undefined;
      throw error;
    },
  );
  return loading;
}
