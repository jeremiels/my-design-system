import { nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { EditableComboboxBase } from "../../bases/editable-combobox/editable-combobox-base.js";
import { fieldIds } from "../../bases/field/field-base.js";
import { DismissController } from "../../controllers/dismiss.js";
import type { ListboxOption } from "../../controllers/listbox.type.js";
import { ListboxSelectEvent } from "../../events/listbox-select.js";
import type { FormValue } from "../../mixins/withFormControl.js";
import { normalizeText } from "../../state/typeahead.js";
import { Tag } from "../tag/tag.js";
import { TagGroup } from "../tag-group/tag-group.js";

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
 * With `multiple`, the user chooses several options (ADR 0038). A pick adds
 * the option, or leaves it out if chosen already, empties the text and
 * keeps the list open: its options have a box, as in a `select` with
 * `multiple`. Under the input, a `tag-group` named by `values-label` lists
 * the chosen options; each tag leaves its option out. `values` holds the
 * chosen values, in the order of the picks, `value` the first one, and the
 * form receives one entry per value.
 *
 * @element u-combobox
 * @summary A labelled text input that filters options, and whose value is one of them.
 * @csspart values - The `tag-group` of the chosen options, with `multiple`.
 */
export class Combobox extends EditableComboboxBase {
  static override componentName = "combobox";

  /** Lists the chosen options with the `tag-group` and `tag` of its own registration. */
  static override dependencies = [...super.dependencies, TagGroup, Tag];

  /** The user chooses several options: `values`. Reflected. */
  @property({ type: Boolean, reflect: true })
  multiple = false;

  /** The chosen values, with `multiple`, in the order of the picks. Property only. */
  @property({ attribute: false })
  values: readonly string[] = [];

  /** The accessible name of the list of the chosen options, with `multiple`, in the page's language. */
  @property({ type: String, attribute: "values-label" })
  valuesLabel = "Chosen options";

  /** The options picked, by value: their labels show in the tags while the options change. */
  #chosen = new Map<string, ListboxOption>();

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

  /** What the user typed, or the label of the option of `value`; only what the user types with `multiple`. */
  protected override get controlText(): string {
    return this.#typed ?? (this.multiple ? "" : this.#textOf(this.value));
  }

  protected override get listboxMultiple(): boolean {
    return this.multiple;
  }

  protected override isOptionSelected(option: ListboxOption): boolean {
    return this.values.includes(option.value);
  }

  /** With `multiple`, one entry per chosen value, under `name`. */
  protected override get formValue(): FormValue {
    if (!this.multiple) {
      return super.formValue;
    }
    if (!this.name) {
      return null;
    }
    const data = new FormData();
    for (const value of this.values) {
      data.append(this.name, value);
    }
    return data;
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
    this.values = [];
    this.#typed = undefined;
    this.#picked = undefined;
    this.#cleared = false;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    // A new value, by a pick or by the application: the input shows its label.
    if (changedProperties.has("value") && !this.multiple) {
      this.#typed = undefined;
    }
    if (this.multiple) {
      this.value = this.values[0] ?? "";
    }
    super.willUpdate(changedProperties);
  }

  /** Validity from `value`, not from the text: `required` and empty, or `setCustomValidity()`. */
  protected override syncValidity(): void {
    const input = this.renderRoot.querySelector<HTMLElement>(`#${fieldIds.control}`);
    const missing = this.multiple ? this.values.length === 0 : this.value === "";
    this.syncValueValidity(this.required && missing, input ?? undefined);
  }

  protected override renderCombobox() {
    return html`
      ${super.renderCombobox()}
      <select class="validity-proxy" required hidden tabindex="-1">
        <option value=""></option>
      </select>
    `;
  }

  /** With `multiple`: the input, its list, then the tags of the chosen options. */
  protected override renderControl(): unknown {
    const tagGroup = this.tagFor(TagGroup);
    const tag = this.tagFor(Tag);
    return html`
      ${super.renderControl()}
      ${
        this.multiple && this.values.length > 0
          ? html`<${tagGroup} part="values" class="values" label=${this.valuesLabel}>
              ${this.values.map(
                (value) =>
                  html`<${tag}
                    ?removable=${!this.readOnly && !this.isDisabled}
                    @u-remove=${() => this.#leaveOut(value)}
                    >${this.#textOf(value)}</${tag}
                  >`,
              )}
            </${tagGroup}>`
          : nothing
      }
    `;
  }

  /** A tag removed: its value leaves `values`, as a user's change. */
  #leaveOut(value: string): void {
    this.values = this.values.filter((chosen) => chosen !== value);
    this.dispatchEvent(
      new InputEvent("input", { bubbles: true, composed: true, inputType: "deleteContent" }),
    );
    this.handleChange();
  }

  /** The text changed: the popup follows it; an empty text clears the value. */
  protected override handleInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.#typed = text;
    if (text === "" && this.value !== "" && !this.multiple) {
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
    if (this.multiple) {
      // One more choice, or one less: the text empties, the list stays open.
      if (!this.dispatchEvent(new ListboxSelectEvent(option))) {
        return;
      }
      this.#chosen.set(option.value, option);
      this.values = this.values.includes(option.value)
        ? this.values.filter((value) => value !== option.value)
        : [...this.values, option.value];
      this.#typed = undefined;
      this.requestUpdate();
      this.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertReplacementText",
          data: this.optionText(option),
        }),
      );
      this.handleChange();
      return;
    }
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
      this.#chosen.get(value) ??
      (this.#picked?.value === value ? this.#picked : undefined);
    return option ? this.optionText(option) : value;
  }
}
