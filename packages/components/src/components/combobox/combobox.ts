import { html, type PropertyValues } from "lit";
import { EditableComboboxBase } from "../../bases/editable-combobox/editable-combobox-base.js";
import { fieldIds } from "../../bases/field/field-base.js";
import { DismissController } from "../../controllers/dismiss.js";
import type { ListboxOption } from "../../controllers/listbox.type.js";
import { normalizeText } from "../../state/typeahead.js";

/**
 * A combobox: the user types to filter a list of options, and picks one.
 * The value is always one of the options, or `""`. The user types "par",
 * picks "Paris": the input shows its label, the form receives its value,
 * "75056". For a free text, use `autocomplete`; for a few options, without
 * typing, `select`. The input, the list, its filter and its keys are those
 * of `EditableComboboxBase` (ADR 0025).
 *
 * Typing filters the options, and leaves `value` as it is. A pick sets it,
 * and fires `input`, then `change`. Emptying the input clears it at once,
 * with the `input` of the text; `change` follows when the user leaves the
 * field, as on a text input.
 *
 * The user leaving the field ends the typing: the option whose label is the
 * text, if it is the only one, without case nor accents, is picked;
 * otherwise the input shows the label of `value` again. Escape, list closed,
 * shows it again too. Enter without an active option picks the option of
 * the text in the same way, and doesn't submit the form while the text
 * differs from the label of `value`.
 *
 * `inputValue` holds the text, and `input` follows each change of it: with
 * `filter="none"`, the application reads it to fetch the options;
 * `loadOptions` fetches them for it. The options must hold that of `value`:
 * the input shows its label. Otherwise, the input shows the label of the
 * last option picked, or the value. With `loadOptions`, give the option of
 * the first value in `options`.
 *
 * A `required` combobox can't be submitted while `value` is empty, whatever
 * the text. Its message is the browser's, from a hidden native `<select>`:
 * give `error-message` to write it in the page's language.
 *
 * @element u-combobox
 * @summary A labelled text input that filters options, and whose value is one of them.
 */
export class Combobox extends EditableComboboxBase {
  static override componentName = "combobox";

  /** The text the user typed since the last pick, `undefined` while the input shows the label of `value`. */
  #typed?: string;

  /** The last option picked: its label shows while the options no longer hold it. */
  #picked?: ListboxOption;

  /** The user emptied the input: `change` follows when they leave the field. */
  #cleared = false;

  constructor() {
    super();
    // The focus leaving the field ends the typing.
    new DismissController(this, {
      active: () => this.#typed !== undefined || this.#cleared,
      dismiss: () => this.#commit(),
      focusOut: true,
    });
  }

  /** What the user typed, or the label of the option of `value`. */
  protected override get controlText(): string {
    return this.#typed ?? this.#textOf(this.value);
  }

  /** What the user typed: the list shows every option while the input shows the label of `value`. */
  protected override get filterText(): string {
    return this.#typed ?? "";
  }

  /** The label of `option`. */
  protected override optionText(option: ListboxOption): string {
    return option.label || option.value;
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.#typed = undefined;
    this.#picked = undefined;
    this.#cleared = false;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    // A new value, by a pick or by the application: the input shows its label.
    if (changedProperties.has("value")) {
      this.#typed = undefined;
    }
    super.willUpdate(changedProperties);
  }

  /** Validity from `value`, not from the text: `required` and empty, or `setCustomValidity()`. */
  protected override syncValidity(): void {
    const input = this.renderRoot.querySelector<HTMLElement>(`#${fieldIds.control}`);
    this.syncValueValidity(this.required && this.value === "", input ?? undefined);
  }

  protected override renderCombobox() {
    return html`
      ${super.renderCombobox()}
      <select class="validity-proxy" required hidden tabindex="-1">
        <option value=""></option>
      </select>
    `;
  }

  /** The text changed: the popup follows it; an empty text clears the value. */
  protected override handleInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.#typed = text;
    if (text === "" && this.value !== "") {
      this.value = "";
      this.#cleared = true;
      this.markInteracted();
    }
    this.requestUpdate();
    this.dispatch({ type: "input" });
  }

  /** Nothing: the value changes on a pick, not when the user leaves the input. */
  protected override handleTextChange(): void {}

  protected override handleChange(): void {
    this.#cleared = false;
    super.handleChange();
  }

  /** Enter and Escape end the typing; then the keys of `EditableComboboxBase`. */
  protected override handleComboboxKeydown(event: KeyboardEvent): void {
    if (this.isDisabled || this.readOnly || event.isComposing || event.keyCode === 229) {
      super.handleComboboxKeydown(event);
      return;
    }
    const typing = this.#typed !== undefined;
    if (event.key === "Escape" && !this.open && typing) {
      // List closed: the label of the value again, and the key stops here,
      // before a modal around the field.
      event.preventDefault();
      event.stopPropagation();
      this.#typed = undefined;
      this.requestUpdate();
      return;
    }
    if (event.key === "Enter" && typing && !(this.open && this.activeOption)) {
      // No option to pick from the list: that of the text, if any. Either
      // way, the form doesn't submit a value the input doesn't show.
      event.preventDefault();
      const option = this.#optionOfText();
      if (option) {
        this.selectOption(option);
      }
      return;
    }
    super.handleComboboxKeydown(event);
  }

  protected override selectOption(option: ListboxOption): void {
    super.selectOption(option);
    if (this.value === option.value) {
      // Picked, even again: the input shows its label.
      this.#picked = option;
      this.#typed = undefined;
      this.requestUpdate();
    }
  }

  /** The user leaves the field: the option of the text, or the label of the value. */
  #commit(): void {
    if (this.#typed !== undefined) {
      const option = this.#optionOfText();
      this.#typed = undefined;
      this.requestUpdate();
      if (option) {
        this.selectOption(option);
      }
    }
    if (this.#cleared) {
      this.handleChange();
    }
  }

  /** The only enabled option whose label is the text, without case nor accents. */
  #optionOfText(): ListboxOption | undefined {
    const text = normalizeText((this.#typed ?? "").trim());
    if (!text) {
      return undefined;
    }
    const matches = this.availableOptions.filter(
      (option) => !option.disabled && normalizeText(this.optionText(option)) === text,
    );
    return matches.length === 1 ? matches[0] : undefined;
  }

  /** The label of the option of `value`, of the last one picked, or the value. */
  #textOf(value: string): string {
    if (value === "") {
      return "";
    }
    const option =
      this.availableOptions.find((candidate) => candidate.value === value) ??
      (this.#picked?.value === value ? this.#picked : undefined);
    return option ? this.optionText(option) : value;
  }
}
