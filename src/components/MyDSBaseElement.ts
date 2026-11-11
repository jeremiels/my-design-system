import { LitElement, type CSSResultGroup } from "lit";
import { property } from "lit/decorators.js";
import baseStyles from "./MyDSBaseElement.css" with { type: "css" };

/**
 * Base class every component extends.
 *
 * Kept intentionally thin: universal resets/properties only. Behavior that
 * not every component needs (open/close, focus delegation, form
 * association, ...) belongs in a mixin from `src/mixins`, not here.
 * Custom events are dispatched as typed `Event` subclasses from
 * `src/events`, not through a generic base-class `emit()` helper — see
 * `src/events/click.ts` for the pattern.
 */
export class DSBaseElement extends LitElement {
  static styles: CSSResultGroup = [baseStyles];

  /**
   * Reflected so `:dir()`/`:lang()` and locale-aware formatting work from
   * the host attribute without extra plumbing in every component.
   */
  @property() dir!: string;
  @property() lang!: string;
}
