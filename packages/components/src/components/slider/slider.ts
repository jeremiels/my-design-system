import { html, type PropertyValues } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { fieldIds } from "../field/field-base.js";
import { RangeFieldBase } from "../range-field/range-field-base.js";
import sliderStyles from "./slider.css" with { type: "css" };
import sliderTokens from "./slider.tokens.css" with { type: "css" };

/**
 * A slider: a label, an optional hint, a native `<input type="range">` and
 * its value. The user picks a number between `min` (0 by default) and `max`
 * (100) by `step` (1), with the pointer or the arrows. The value is never
 * empty: as a native range, the slider takes the middle of its bounds, and
 * rounds a value off the step (ADR 0019).
 *
 * The value shows after the track, hidden from assistive technologies: the
 * native input announces it.
 *
 * @element u-slider
 * @summary A labelled range input that takes part in its form.
 * @csspart input - The native `<input type="range">`, its track and its thumb.
 * @csspart value - The value, after the track.
 * @tokens slider - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/slider/`): `npm run analyze` documents them.
 */
export class Slider extends RangeFieldBase {
  static override componentName = "slider";

  static styles = [super.styles ?? [], sliderTokens, sliderStyles];

  /** The share of the track before the thumb, from 0 to 1. */
  get #ratio(): number {
    const min = Number(this.min ?? 0);
    const max = Number(this.max ?? 100);
    const value = Number(this.value);
    return max > min && Number.isFinite(value)
      ? Math.min(Math.max((value - min) / (max - min), 0), 1)
      : 0;
  }

  /** Whether the text runs right to left: the filled part of the track starts on the right. */
  #rtl = false;

  override connectedCallback(): void {
    super.connectedCallback();
    const rtl = getComputedStyle(this).direction === "rtl";
    if (rtl !== this.#rtl) {
      this.#rtl = rtl;
      this.requestUpdate();
    }
  }

  protected renderControl() {
    return html`
      <div
        class="range"
        style=${styleMap({
          "--slider-ratio": String(this.#ratio),
          "--slider-fill-direction": this.#rtl ? "left" : "right",
        })}
      >
        ${this.renderInput("range")}
        <output part="value" class="value" for=${fieldIds.control} aria-hidden="true"
          >${this.value}</output
        >
      </div>
    `;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    // The native range never holds an empty value, nor one off its bounds
    // or its step: the property follows its sanitized value.
    const control = this.renderRoot.querySelector<HTMLInputElement>(`#${fieldIds.control}`);
    if (control && control.value !== this.value) {
      this.value = control.value;
    }
  }
}
