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

      try {
        this.internals = this.attachInternals();
      } catch {
        console.error(
          "ElementInternals is not supported in this environment; custom states will be unavailable.",
        );
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
