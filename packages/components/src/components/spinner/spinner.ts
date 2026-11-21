import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import type { ComponentSize } from "../../types/common.js";
import spinnerStyles from "./spinner.css" with { type: "css" };
import spinnerTokens from "./spinner.tokens.css" with { type: "css" };

/**
 * A spinner: something loads, for an unknown time (ADR 0027). For a known
 * share done, use `progress`.
 *
 * It is a `role="progressbar"` without a value, named by `label`, or else
 * by `loadingLabel`. Assistive technologies read it where it is; they don't
 * hear it appear: announce a load that the user waits for with a live
 * region, or put the spinner in a region with `aria-busy`.
 *
 * The ring turns, slower when the user asks for reduced motion: a load that
 * stops showing would look finished.
 *
 * @element u-spinner
 * @summary An indicator that something loads, for an unknown time.
 * @csspart spinner - The ring, with `role="progressbar"`.
 * @tokens spinner - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/spinner/`): `npm run analyze` documents them.
 */
export class Spinner extends DSBaseElement {
  static override componentName = "spinner";

  static styles = [super.styles ?? [], spinnerTokens, spinnerStyles];

  /** What loads: the accessible name, "Sending the file" for instance. `loadingLabel` when empty. */
  @property({ type: String })
  label = "";

  /** The accessible name when `label` is empty. */
  @property({ type: String, attribute: "loading-label" })
  loadingLabel = "Loading…";

  /** The size: `small` inside a control, `medium` next to text, `large` for a region. */
  @property({ type: String, reflect: true })
  size: ComponentSize = "medium";

  render() {
    return html`<span
      part="spinner"
      class="spinner"
      role="progressbar"
      aria-label=${this.label || this.loadingLabel}
    ></span>`;
  }
}
