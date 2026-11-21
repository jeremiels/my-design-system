import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { ListboxController, listboxStyles, listboxTokens } from "../../controllers/listbox.js";
import type { ListboxOption } from "../../controllers/listbox.type.js";
import { ListboxSelectEvent } from "../../events/listbox-select.js";
import { collectionKeyMove } from "../../state/collection.js";
import { normalizeText } from "../../state/typeahead.js";
import { ComboboxBase } from "../combobox/combobox-base.js";
import { fieldIds } from "../field/field-base.js";
import type { ComboboxFilter } from "./editable-combobox.type.js";

/**
 * Shared base of the editable comboboxes of the APG: a text input, and a
 * list below it of the options that match the text. Abstract: `autocomplete`
 * keeps the text as its value, `combobox` restricts its value to the options
 * (ADR 0025). The label, the hint, the error and the form behavior are those
 * of `FieldBase`; the popup and its state are those of `ComboboxBase`; the
 * list is that of a `ListboxController`.
 *
 * The options are `options`, or else the `<option>` children of the field.
 * With `filter="none"`, the application filters them itself: it listens to
 * `input`, reads the text in `inputValue`, and sets `options`, from a server
 * for instance. New options open the list while the user types.
 *
 * Keys, list open: ArrowDown and ArrowUp move to the next and previous
 * option, looping at the ends; Enter picks the active one; Escape closes
 * the list and keeps the text; Home, End and the other keys edit the text.
 *
 * While the user types, a live region announces the number of options that
 * match: `resultsMessage` writes it.
 *
 * The browser's own suggestions (`autocomplete`) are off by default: they
 * would cover the list. Give `autocomplete` to have both.
 *
 * @slot - The options as `<option>` elements, when `options` isn't set: their `value`, their `label` or text, and `disabled`. They aren't shown: the list renders copies of them.
 * @csspart input - The native `<input>`, the combobox.
 * @csspart listbox - The list of options, in the popup.
 * @csspart option - An option. The active one has `aria-selected="true"`, a disabled one `aria-disabled="true"`.
 * @fires {ListboxSelectEvent} u-select - When the user picks an option, before the field takes its value. Its `option` is the option. Cancelable: `preventDefault()` keeps the value.
 * @tokens listbox - Its list's tokens (`@cssprop`), shared by every list of options, from `@unicorne/tokens` (`src/component/listbox/`): `npm run analyze` documents them.
 */
export abstract class EditableComboboxBase extends ComboboxBase {
  static styles = [super.styles ?? [], listboxTokens, listboxStyles];

  /**
   * The options, as data: `{ value, label?, disabled? }`. Take precedence
   * over the `<option>` children. Property only.
   */
  @property({ attribute: false })
  options?: readonly ListboxOption[];

  /**
   * Which options match the text, without case nor accents: those that
   * `contains` it, those that `starts-with` it, or all of them with `none`,
   * when the application filters them itself.
   */
  @property({ type: String })
  filter: ComboboxFilter = "contains";

  /**
   * Writes what assistive technologies hear while the user types: the
   * number of options that match the text. Give it in the page's language.
   * Property only.
   */
  @property({ attribute: false })
  resultsMessage: (count: number) => string = (count) =>
    count === 0 ? "No suggestions" : count === 1 ? "1 suggestion" : `${count} suggestions`;

  #listbox = new ListboxController(this, {
    labelledBy: fieldIds.label,
    options: () => this.listboxOptions,
    activeIndex: () => this.comboboxState.activeIndex,
    activate: (index) => this.dispatch({ type: "activate", index }),
    select: (option) => this.selectOption(option),
    renderOption: (option, index) => this.renderOption(option, index),
  });

  /** The options of the last render: other ones have no active option yet. */
  #available?: readonly ListboxOption[];

  /** The last result of `listboxOptions`, computed again when its inputs change. */
  #matching?: {
    options: readonly ListboxOption[];
    query: string;
    filter: ComboboxFilter;
    result: readonly ListboxOption[];
  };

  /** The text of the input: what the user types, or the text of the value. Read-only. */
  get inputValue(): string {
    return this.controlText;
  }

  /** The options: `options` when set, the `<option>` children otherwise. */
  protected get availableOptions(): readonly ListboxOption[] {
    return this.options ?? this.#listbox.childOptions;
  }

  /** The text the options match: that of the input by default. */
  protected get filterText(): string {
    return this.controlText;
  }

  /** The options that match `filterText`: all of them while it's empty, or with `filter="none"`. */
  protected get listboxOptions(): readonly ListboxOption[] {
    const options = this.availableOptions;
    const query = this.filterText.trim();
    const cache = this.#matching;
    if (
      cache &&
      cache.options === options &&
      cache.query === query &&
      cache.filter === this.filter
    ) {
      return cache.result;
    }
    const result =
      this.filter === "none" || !query
        ? options
        : options.filter((option) => this.optionMatches(option, query));
    this.#matching = { options, query, filter: this.filter, result };
    return result;
  }

  /** The active option, `undefined` when none. */
  protected get activeOption(): ListboxOption | undefined {
    return this.#listbox.activeOption;
  }

  /**
   * Whether `option` matches `query`, the trimmed text: its label contains
   * it, or starts with it, without case nor accents. Override it for
   * another comparison; `filter="none"` never calls it.
   */
  protected optionMatches(option: ListboxOption, query: string): boolean {
    const label = normalizeText(option.label || option.value);
    const text = normalizeText(query);
    return this.filter === "starts-with" ? label.startsWith(text) : label.includes(text);
  }

  protected override get hasPopupContent(): boolean {
    return this.listboxOptions.length > 0;
  }

  protected override get popupItems(): readonly ListboxOption[] {
    return this.listboxOptions;
  }

  protected override get comboboxControls(): string {
    return this.#listbox.id;
  }

  /** While the user types: the number of options that match the text. */
  protected override get popupStatus(): string {
    return this.comboboxState.typed ? this.resultsMessage(this.listboxOptions.length) : "";
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    // Other options: the active index would point at another one.
    const available = this.availableOptions;
    if (available !== this.#available) {
      this.#available = available;
      this.dispatch({ type: "items" });
    }
    super.willUpdate(changedProperties);
  }

  protected renderCombobox() {
    return html`
      <input
        part="input"
        class="control"
        id="control"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded=${this.comboboxExpanded}
        aria-controls=${this.comboboxControls}
        aria-activedescendant=${this.#listbox.activeDescendant}
        .value=${live(this.controlText)}
        ?required=${this.required}
        ?readonly=${this.readOnly}
        ?disabled=${this.isDisabled}
        autocomplete=${this.autocomplete ?? "off"}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @input=${this.handleInput}
        @change=${this.handleTextChange}
        @keydown=${this.handleComboboxKeydown}
      />
    `;
  }

  protected renderPopup() {
    return this.#listbox.render();
  }

  /** The text the input shows once the user picks `option`: its value by default. */
  protected optionText(option: ListboxOption): string {
    return option.value;
  }

  /** Renders the content of an option: its label, or its value. Override it for a richer content. */
  protected renderOption(option: ListboxOption, _index: number): unknown {
    return option.label || option.value;
  }

  /** The text changed: `FieldBase` takes it as the value, then the popup follows it. */
  protected override handleInput(event: Event): void {
    super.handleInput(event);
    this.dispatch({ type: "input" });
  }

  /**
   * For `renderCombobox()`: the `change` listener of the input, when the
   * user leaves it after changing the text. `handleChange()` by default.
   */
  protected handleTextChange(): void {
    this.handleChange();
  }

  protected override handlePopupKeydown(event: KeyboardEvent): boolean {
    const move = collectionKeyMove(event.key, { axis: "vertical" });
    if (move) {
      this.dispatch({ type: "move", to: move });
      return true;
    }
    if (event.key === "Enter") {
      const option = this.activeOption;
      if (option && !option.disabled) {
        this.selectOption(option);
        return true;
      }
      // No active option: the key is the field's.
      this.hidePopup();
    } else if (["Home", "End", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      // Back to the text.
      this.dispatch({ type: "activate", index: -1 });
    }
    return false;
  }

  /**
   * Called when the user picks an enabled option, by a click or Enter.
   * Fires `u-select`, then, unless canceled, gives the field the option's
   * value, as a user's change: `input`, then `change`. The list closes; the
   * focus stays in the input.
   */
  protected selectOption(option: ListboxOption): void {
    const picked = this.dispatchEvent(new ListboxSelectEvent(option));
    this.hidePopup();
    if (!picked || option.value === this.value) {
      return;
    }
    this.value = option.value;
    this.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType: "insertReplacementText",
        data: this.optionText(option),
      }),
    );
    this.handleChange();
  }
}
