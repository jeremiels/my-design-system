import { EditableComboboxBase } from "../../bases/editable-combobox/editable-combobox-base.js";

/**
 * A text field with suggestions: the list below the input shows the
 * suggestions that match the text, and the user picks one or keeps typing.
 * The value is the text, free: a suggestion only fills it, as `<input list>`
 * does. For a value restricted to the suggestions, use `combobox`. The
 * input, the list, its filter and its keys are those of
 * `EditableComboboxBase` (ADR 0025).
 *
 * Enter without an active suggestion closes the list: the text is the
 * value, and the form may submit.
 *
 * @element u-autocomplete
 * @summary A labelled text input that suggests values as the user types.
 */
export class Autocomplete extends EditableComboboxBase {
  static override componentName = "autocomplete";

  /** The value of the last `change`: the inner input may fire it again, on blur. */
  #changed?: string;

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.#changed = undefined;
  }

  protected override handleChange(): void {
    // Firefox fires `change` on blur after a pick: the value hasn't changed since.
    if (this.value === this.#changed) {
      return;
    }
    this.#changed = this.value;
    super.handleChange();
  }
}
