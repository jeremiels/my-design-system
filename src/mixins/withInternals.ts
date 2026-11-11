import type { LitElement } from "lit";
import type { AbstractConstructor, Constructor } from "../types/common.js";

export declare class InternalsInterface {
  internals?: ElementInternals;
  customStates: {
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
    internals?: ElementInternals;

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
     */
    customStates = {
      set: (name: string, active: boolean) => {
        if (!this.internals?.states) {
          return;
        }
        if (active) {
          this.internals.states.add(name);
        } else {
          this.internals.states.delete(name);
        }
      },
      has: (name: string): boolean => {
        if (!this.internals?.states) {
          return false;
        }
        return this.internals.states.has(name);
      },
    };
  }
  return InternalsElement as Constructor<InternalsInterface> & T;
}
