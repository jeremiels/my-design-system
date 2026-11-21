import { html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { ListboxController, listboxStyles, listboxTokens } from "../../controllers/listbox.js";
import type { FormValue } from "../../mixins/withFormControl.js";
import { collectionKeyMove } from "../../state/collection.js";
import { orderedValues, toggleValue } from "../../state/selection.js";
import {
  emptyTypeahead,
  isTypeaheadKey,
  typeahead,
  type TypeaheadState,
} from "../../state/typeahead.js";
import { PickerBase, type PickerEntry } from "../../bases/picker/picker-base.js";
import { fieldIds } from "../../bases/field/field-base.js";
import type { ListboxOption } from "../../controllers/listbox.type.js";
import selectStyles from "./select.css" with { type: "css" };
import selectTokens from "./select.tokens.css" with { type: "css" };

/**
 * A select: the user picks one value among its options, in a list below
 * the control. The value is always one of the options, or `""`: for a free
 * text, use `autocomplete`. The label, the hint, the error and the form
 * behavior are those of `FieldBase`; the control is that of `PickerBase`; the
 * popup and its state are those of `ComboboxBase`; the list is that of a
 * `ListboxController` (ADR 0018).
 *
 * The options are `options`, or else the `<option>` children of the select.
 * The control shows the label of the selected option, or `placeholder`.
 *
 * Keys, list closed: ArrowDown, Enter and Space open it on the selected
 * option; ArrowUp and Home open it on the first option, End on the last.
 * List open: the arrows, Home and End move the active option; Enter, Space,
 * Tab and Alt+ArrowUp pick it; Escape closes the list and keeps the value.
 * Typing the start of an option's label makes it active, and opens the
 * list.
 *
 * A `required` select can't be submitted while `value` is empty. Its message
 * is the browser's, from a hidden native `<select>`: give `error-message` to
 * write it in the page's language.
 *
 * Its `input` and `change` events follow each pick that changes `value`, as
 * those of a native `<select>`.
 *
 * With `multiple`, the user chooses several options: Enter, Space and a
 * click choose an option or leave it out, and the list stays open. `values`
 * holds the chosen values, `value` the first one, and the form receives one
 * entry per value, as a `<select multiple>`. The `selected` of the
 * `<option>` children are the default choices.
 *
 * @element u-select
 * @summary A labelled list of options to pick one from, that takes part in its form.
 * @slot - The options as `<option>` elements, when `options` isn't set: their `value`, their `label` or text, and `disabled`. They aren't shown: the list renders copies of them.
 * @csspart listbox - The list of options, in the popup.
 * @csspart option - An option. The active one has `aria-selected="true"`, a disabled one `aria-disabled="true"`.
 * @tokens select - Its options' tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/select/`): `npm run analyze` documents them.
 * @tokens listbox - Its list's tokens (`@cssprop`), shared by every list of options, from `@unicorne/tokens` (`src/component/listbox/`): `npm run analyze` documents them.
 */
export class Select extends PickerBase {
  static override componentName = "select";

  static styles = [super.styles ?? [], listboxTokens, listboxStyles, selectTokens, selectStyles];

  /**
   * The options, as data: `{ value, label?, disabled? }`. Take precedence
   * over the `<option>` children. Property only.
   */
  @property({ attribute: false })
  options?: readonly ListboxOption[];

  /** The user chooses several options: `values`. Reflected. */
  @property({ type: Boolean, reflect: true })
  multiple = false;

  /** The chosen values, with `multiple`; `undefined` until the defaults are read. */
  #values?: readonly string[];

  /**
   * The chosen values, with `multiple`, in the order of the options. Set it
   * to choose the options of these values. Property only.
   */
  get values(): readonly string[] {
    return this.#values ?? this.#defaultValues;
  }
  set values(values: readonly string[]) {
    this.#values = orderedValues(this.availableOptions, values);
    this.requestUpdate();
  }

  /** The default choices: the options marked `selected`. */
  get #defaultValues(): readonly string[] {
    return this.availableOptions.filter((option) => option.selected).map((option) => option.value);
  }

  #listbox = new ListboxController(this, {
    labelledBy: fieldIds.label,
    options: () => this.availableOptions,
    activeIndex: () => this.comboboxState.activeIndex,
    activate: (index) => this.dispatch({ type: "activate", index }),
    select: (option) => this.selectOption(option),
    renderOption: (option, index) => this.renderOption(option, index),
    multiple: () => this.multiple,
    selected: (option) => this.values.includes(option.value),
  });

  #typeahead: TypeaheadState = emptyTypeahead;

  /** The options of the last render: other ones have no active option yet. */
  #available?: readonly ListboxOption[];

  /** The options: `options` when set, the `<option>` children otherwise. */
  protected get availableOptions(): readonly ListboxOption[] {
    return this.options ?? this.#listbox.childOptions;
  }

  /** The option whose value is `value`, if any. */
  protected get selectedOption(): ListboxOption | undefined {
    return this.value === ""
      ? undefined
      : this.availableOptions.find((option) => option.value === this.value);
  }

  protected override get hasPopupContent(): boolean {
    return this.availableOptions.length > 0;
  }

  protected override get popupItems(): readonly ListboxOption[] {
    return this.availableOptions;
  }

  protected override get comboboxControls(): string {
    return this.#listbox.id;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    const available = this.availableOptions;
    if (available !== this.#available) {
      this.#available = available;
      this.dispatch({ type: "items" });
    }
    if (this.multiple) {
      this.value = this.values[0] ?? "";
    }
    super.willUpdate(changedProperties);
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

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.#values = undefined;
  }

  /** A missing value: `required`, and no value, or no chosen value with `multiple`. */
  protected override get valueMissing(): boolean {
    return this.required && (this.multiple ? this.values.length === 0 : this.value === "");
  }

  protected override get controlActiveDescendant() {
    return this.#listbox.activeDescendant;
  }

  /** The text of the control: the chosen options' labels, or the placeholder. */
  protected override get displayText(): string {
    if (this.multiple) {
      return this.availableOptions
        .filter((option) => this.values.includes(option.value))
        .map((option) => option.label || option.value)
        .join(", ");
    }
    const selected = this.selectedOption;
    return selected ? selected.label || selected.value : "";
  }

  protected renderPopup() {
    return this.#listbox.render();
  }

  /** Renders the content of an option: its label, or its value. Override it for a richer content. */
  protected renderOption(option: ListboxOption, _index: number): unknown {
    // With several choices, the box of each option says it.
    const selected = !this.multiple && option.value === this.value;
    return html`<span class=${selected ? "option-selected" : nothing}
      >${option.label || option.value}</span
    >`;
  }

  /** Typeahead, and the keys that pick, then those of `PickerBase`. */
  protected override handleComboboxKeydown(event: KeyboardEvent): void {
    if (this.isDisabled || this.readOnly || event.isComposing || event.keyCode === 229) {
      return;
    }
    const time = event.timeStamp;
    if (isTypeaheadKey(event, this.#typeahead, time)) {
      event.preventDefault();
      this.#typeAhead(event.key, time);
      return;
    }
    const { key, altKey } = event;
    if (this.open && !this.multiple && (key === "Tab" || (key === "ArrowUp" && altKey))) {
      this.#pickActive();
    }
    super.handleComboboxKeydown(event);
  }

  protected override handlePopupKeydown(event: KeyboardEvent): boolean {
    const move = collectionKeyMove(event.key, { axis: "vertical", homeEnd: true });
    if (move) {
      this.dispatch({ type: "move", to: move });
      return true;
    }
    if (event.key === "Enter" || event.key === " ") {
      this.#pickActive();
      return true;
    }
    return false;
  }

  /**
   * Called when the user picks an enabled option: by a click, Enter, Space,
   * Tab or Alt+ArrowUp. The list closes; the focus stays on the control. A
   * new value fires `input`, then `change`.
   */
  protected selectOption(option: ListboxOption): void {
    if (this.multiple) {
      // Several choices: the list stays open.
      const values = toggleValue(this.availableOptions, this.values, option.value);
      if (values !== this.values) {
        this.#values = values;
        this.requestUpdate();
        this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        this.handleChange();
      }
      return;
    }
    this.hidePopup();
    if (option.disabled || option.value === this.value) {
      return;
    }
    this.value = option.value;
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.handleChange();
  }

  #pickActive(): void {
    const option = this.#listbox.activeOption;
    if (option && !option.disabled) {
      this.selectOption(option);
    } else {
      this.hidePopup();
    }
  }

  /** Opens the list, on the selected option, or on the first or last enabled one. */
  protected openPicker(entry: PickerEntry): void {
    const selected = this.availableOptions.findIndex((option) => option.value === this.value);
    if (entry === "selected" && selected >= 0 && !this.availableOptions[selected]!.disabled) {
      this.showPopup("none");
      this.dispatch({ type: "activate", index: selected });
    } else {
      this.showPopup(entry === "last" ? "last" : "first");
    }
  }

  #typeAhead(key: string, time: number): void {
    const options = this.availableOptions;
    const result = typeahead(
      this.#typeahead,
      key,
      time,
      options.map((option) => ({ label: option.label || option.value, disabled: option.disabled })),
      // Closed: from the selected option, as a native <select>.
      this.open
        ? this.comboboxState.activeIndex
        : options.findIndex((option) => option.value === this.value),
    );
    this.#typeahead = result.state;
    if (!this.open) {
      this.showPopup("none");
    }
    if (result.index >= 0) {
      this.dispatch({ type: "activate", index: result.index });
    }
  }
}
