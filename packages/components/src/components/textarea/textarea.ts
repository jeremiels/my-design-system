import { html } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { FieldBase } from "../field/field-base.js";
import textareaStyles from "./textarea.css" with { type: "css" };

/**
 * A multi-line text field: a label, an optional hint, a native `<textarea>`
 * and its error message. Its validation adds the constraints of `minlength`
 * and `maxlength`. The user resizes it vertically. The label, the hint, the
 * error message and the form behavior are those of `FieldBase`.
 *
 * As for `text-field`, the `value` attribute is the default value, not the
 * text content: the form's reset restores it.
 *
 * @element u-textarea
 * @summary A labelled multi-line text input that takes part in its form.
 * @csspart textarea - The native `<textarea>`.
 */
export class Textarea extends FieldBase {
  static override componentName = "textarea";

  static styles = [super.styles ?? [], textareaStyles];

  /** Visible height, in lines of text. The browser's default is 2. */
  @property({ type: Number })
  rows?: number;

  /** Minimum length of the value, in characters. */
  @property({ type: Number, attribute: "minlength" })
  minLength?: number;

  /** Maximum length of the value, in characters: the textarea stops there. */
  @property({ type: Number, attribute: "maxlength" })
  maxLength?: number;

  protected renderControl() {
    return html`
      <textarea
        part="textarea"
        class="control"
        id="control"
        .value=${live(this.value)}
        rows=${ifDefined(this.rows)}
        ?required=${this.required}
        ?readonly=${this.readOnly}
        ?disabled=${this.isDisabled}
        autocomplete=${ifDefined(this.autocomplete)}
        minlength=${ifDefined(this.minLength)}
        maxlength=${ifDefined(this.maxLength)}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @input=${this.handleInput}
        @change=${this.handleChange}
      ></textarea>
    `;
  }
}
