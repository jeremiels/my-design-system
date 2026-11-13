import type { LitElement } from "lit";
import type { AbstractConstructor, Constructor } from "../types/common.js";

/**
 * Chrome 90–124 ship a `CustomStateSet` that only takes the old `--name`
 * syntax: `states.add("open")` throws a SyntaxError there. Standard `:state()`
 * support is the reliable signal; without it custom states are a no-op, as in
 * Firefox < 126 / Safari < 17.4, which have no `states` at all.
 */
const supportsCustomStates = typeof CSS !== "undefined" && CSS.supports("selector(:state(x))");

// Protected: for the component and its subclasses (brands included), not for
// the application — `internals` gives full control over the element's form
// value, validity and ARIA.
export declare class InternalsInterface {
  protected internals?: ElementInternals;
  protected customStates: {
    set: (name: string, active: boolean) => void;
    has: (name: string) => boolean;
  };
}

/**
 * Mixin: Attaches `ElementInternals` and exposes it as `this.internals`.
 *
 * `attachInternals()` can only be called once per element, so any component
 * that needs form participation (`internals.form`, `setFormValue`, validity)
 * or `:state()` custom states should apply this mixin and read `this.internals`
 * — never call `this.attachInternals()` directly.
 */
export function withInternals<T extends AbstractConstructor<LitElement>>(Base: T) {
  abstract class InternalsElement extends Base {
    protected internals?: ElementInternals;

    constructor(...args: any[]) {
      super(...args);

      // Every supported browser has `attachInternals()`: only a DOM emulation
      // may lack it. Its errors are bugs and propagate — "already attached"
      // means a class in the chain called it itself, or applied this mixin twice.
      if (typeof this.attachInternals === "function") {
        this.internals = this.attachInternals();
      }
    }

    /**
     * Wraps `internals.states` so components can toggle `:state(x)` selectors
     * (e.g. `:state(open)`) instead of reflecting extra boolean attributes.
     * A no-op where `:state()` is unsupported (see `supportsCustomStates`), so
     * `:state()` styling must stay an enhancement — reflect an attribute too
     * when the state is needed for the component to look right.
     */
    protected customStates = {
      set: (name: string, active: boolean) => {
        if (!supportsCustomStates || !this.internals?.states) {
          return;
        }
        if (active) {
          this.internals.states.add(name);
        } else {
          this.internals.states.delete(name);
        }
      },
      has: (name: string): boolean => {
        if (!supportsCustomStates || !this.internals?.states) {
          return false;
        }
        return this.internals.states.has(name);
      },
    };
  }
  // Through `unknown`: protected members make the interface nominal.
  return InternalsElement as unknown as Constructor<InternalsInterface> & T;
}
