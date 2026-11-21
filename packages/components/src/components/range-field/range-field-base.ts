import { html, type TemplateResult } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { FieldBase, fieldIds } from "../field/field-base.js";

/**
 * Shared base of the fields whose value has bounds and a step: `number-field`,
 * `date-field` and `slider`. Each renders a native `<input>` of its `type`,
 * which validates the bounds and the step, and gives the browser's messages
 * (ADR 0019). The label, the hint, the error and the form behavior are those
 * of `FieldBase`.
 *
 * `min`, `max` and `step` are strings, as on a native input: a number, or a
 * date in the format of HTML (`YYYY-MM-DD`). `step="any"` takes any value.
 */
export abstract class RangeFieldBase extends FieldBase {
  /** The smallest value: below it, the field is invalid. */
  @property({ type: String })
  min?: string;

  /** The largest value: above it, the field is invalid. */
  @property({ type: String })
  max?: string;

  /** The interval between two valid values, from `min`. `any` for none. */
  @property({ type: String })
  step?: string;

  /**
   * For `renderControl()`: the native input, with the contract of
   * `FieldBase.renderControl()` and the bounds. A single-line one submits
   * its form on Enter.
   */
  protected renderInput(type: "number" | "date" | "range", part = "input"): TemplateResult {
    return html`
      <input
        part=${part}
        class="control"
        id=${fieldIds.control}
        type=${type}
        .value=${live(this.value)}
        min=${ifDefined(this.min)}
        max=${ifDefined(this.max)}
        step=${ifDefined(this.step)}
        ?required=${this.required}
        ?readonly=${this.readOnly}
        ?disabled=${this.isDisabled}
        autocomplete=${ifDefined(this.autocomplete)}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @input=${this.handleInput}
        @change=${this.handleChange}
        @keydown=${type === "range" ? undefined : this.submitOnEnter}
      />
    `;
  }
}
