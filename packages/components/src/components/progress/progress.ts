import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import progressStyles from "./progress.css" with { type: "css" };
import progressTokens from "./progress.tokens.css" with { type: "css" };

/**
 * A progress bar: how much of a task is done, a file sent for instance
 * (ADR 0027). Without `value`, the task's length is unknown, as with a
 * native `<progress>`: the bar moves without showing a share. For a short
 * wait next to a control, use `spinner`.
 *
 * The bar is a `role="progressbar"` named by its visible `label`, with
 * `aria-valuenow`, `aria-valuemax` and the text of `valueMessage` as
 * `aria-valuetext`. The value also shows after the label. Assistive
 * technologies read the bar where it is: announce its end with a live
 * region, an `alert` for instance.
 *
 * @element u-progress
 * @summary A labelled bar of how much of a task is done.
 * @csspart label - The label, above the bar.
 * @csspart value - The value, after the label: the text of `valueMessage`.
 * @csspart track - The bar, with `role="progressbar"`.
 * @csspart indicator - The part of the bar done.
 * @tokens progress - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/progress/`): `npm run analyze` documents them.
 */
export class Progress extends DSBaseElement {
  static override componentName = "progress";

  static styles = [super.styles ?? [], progressTokens, progressStyles];

  /** What progresses, shown above the bar: its accessible name. `loadingLabel` when empty. */
  @property({ type: String })
  label = "";

  /** The accessible name when `label` is empty. */
  @property({ type: String, attribute: "loading-label" })
  loadingLabel = "Loading…";

  /**
   * How much is done, from 0 to `max`. `undefined` while the task's length
   * is unknown: the attribute is absent, as on a native `<progress>`.
   */
  @property({ type: Number })
  value?: number;

  /** The value of a finished task. `1` or more; `100` by default. */
  @property({ type: Number })
  max = 100;

  /**
   * Writes the value, shown after the label and read by assistive
   * technologies: a percentage in the page's language by default. Give it
   * for another text, "3 files of 10" for instance. Property only.
   */
  @property({ attribute: false })
  valueMessage: (value: number, max: number) => string = (value, max) =>
    new Intl.NumberFormat(this.language, { style: "percent" }).format(value / max);

  /** The finished value: `max`, or 100 when it isn't a positive number. */
  get #max(): number {
    return this.max > 0 ? this.max : 100;
  }

  /** The value between 0 and the finished value, `undefined` while unknown. */
  get #value(): number | undefined {
    const value = this.value;
    return value === undefined || value === null || Number.isNaN(value)
      ? undefined
      : Math.min(Math.max(value, 0), this.#max);
  }

  render() {
    const value = this.#value;
    const max = this.#max;
    const text = value === undefined ? "" : this.valueMessage(value, max);
    return html`
      <div class="header" ?hidden=${!this.label && !text}>
        <span part="label" class="label" id="label">${this.label}</span>
        <span part="value" class="value" aria-hidden="true">${text}</span>
      </div>
      <div
        part="track"
        class="track"
        role="progressbar"
        aria-labelledby=${this.label ? "label" : nothing}
        aria-label=${this.label ? nothing : this.loadingLabel}
        aria-valuemin=${value === undefined ? nothing : 0}
        aria-valuemax=${value === undefined ? nothing : max}
        aria-valuenow=${value ?? nothing}
        aria-valuetext=${text || nothing}
      >
        <div
          part="indicator"
          class="indicator"
          style=${value === undefined ? nothing : `inline-size: ${(value / max) * 100}%`}
        ></div>
      </div>
    `;
  }
}
