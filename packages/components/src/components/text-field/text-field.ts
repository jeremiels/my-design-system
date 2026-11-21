import { html } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { FieldBase } from "../../bases/field/field-base.js";
import type { TextFieldType } from "./text-field.type.js";

/**
 * A text field: a label, an optional hint, a native `<input>` and its error
 * message, on one line of text. Its validation adds the constraints of
 * `type`, `minlength`, `maxlength` and `pattern`. The label, the hint, the
 * error message and the form behavior are those of `FieldBase`.
 *
 * @element u-text-field
 * @summary A labelled text input that takes part in its form.
 * @csspart input - The native `<input>`.
 */
export class TextField extends FieldBase {
  static override componentName = "text-field";

  /** Type of the input: `text`, `email`, `password`, `tel`, `url` or `search`. */
  @property({ type: String })
  type: TextFieldType = "text";

  /** Minimum length of the value, in characters. */
  @property({ type: Number, attribute: "minlength" })
  minLength?: number;

  /** Maximum length of the value, in characters: the input stops there. */
  @property({ type: Number, attribute: "maxlength" })
  maxLength?: number;

  /** A regular expression the whole value must match. */
  @property({ type: String })
  pattern?: string;

  protected renderControl() {
    return html`
      <input
        part="input"
        class="control"
        id="control"
        type=${this.type}
        .value=${live(this.value)}
        ?required=${this.required}
        ?readonly=${this.readOnly}
        ?disabled=${this.isDisabled}
        autocomplete=${ifDefined(this.autocomplete)}
        minlength=${ifDefined(this.minLength)}
        maxlength=${ifDefined(this.maxLength)}
        pattern=${ifDefined(this.pattern)}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @input=${this.handleInput}
        @change=${this.handleChange}
        @keydown=${this.submitOnEnter}
      />
    `;
  }
}
