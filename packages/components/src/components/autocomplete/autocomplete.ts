import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { ListboxController, listboxStyles, listboxTokens } from "../../controllers/listbox.js";
import { ListboxSelectEvent } from "../../events/listbox-select.js";
import { collectionKeyMove } from "../../state/collection.js";
import { normalizeText } from "../../state/typeahead.js";
import { ComboboxBase } from "../combobox/combobox-base.js";
import { fieldIds } from "../field/field-base.js";
import type { ListboxOption } from "../listbox/listbox.type.js";
import type { AutocompleteFilter } from "./autocomplete.type.js";

/**
 * A text field with suggestions: the list below the input shows the
 * suggestions that match the text, and the user picks one or keeps typing.
 * The value is the text, free: a suggestion only fills it, as `<input list>`
 * does. The label, the hint, the error and the form behavior are those of
 * `FieldBase`; the popup and its state are those of `ComboboxBase`; the list
 * is that of a `ListboxController`.
 *
 * The suggestions are `options`, or else the `<option>` children of the
 * field. With `filter="none"`, the application filters them itself: it
 * listens to `input` and sets `options`, from a server for instance. New
 * options open the list while the user types.
 *
 * Keys, list open: ArrowDown and ArrowUp move to the next and previous
 * suggestion, looping at the ends; Enter picks the active one; Escape closes
 * the list and keeps the text; Home, End and the other keys edit the text.
 * Enter without an active suggestion closes the list.
 *
 * While the user types, a live region announces the number of suggestions:
 * `resultsMessage` writes it.
 *
 * The browser's own suggestions (`autocomplete`) are off by default: they
 * would cover the list. Give `autocomplete` to have both.
 *
 * @element u-autocomplete
 * @summary A labelled text input that suggests values as the user types.
 * @slot - The suggestions as `<option>` elements, when `options` isn't set: their `value`, their `label` or text, and `disabled`. They aren't shown: the list renders copies of them.
 * @csspart input - The native `<input>`, the combobox.
 * @csspart listbox - The list of suggestions, in the popup.
 * @csspart option - A suggestion. The active one has `aria-selected="true"`, a disabled one `aria-disabled="true"`.
 * @fires {ListboxSelectEvent} u-select - When the user picks a suggestion, before the field takes its value. Its `option` is the suggestion. Cancelable: `preventDefault()` keeps the text.
 * @tokens listbox - Its list's tokens (`@cssprop`), shared by every list of options, from `@unicorne/tokens` (`src/component/listbox/`): `npm run analyze` documents them.
 */
export class Autocomplete extends ComboboxBase {
  static override componentName = "autocomplete";

  static styles = [super.styles ?? [], listboxTokens, listboxStyles];

  /**
   * The suggestions, as data: `{ value, label?, disabled? }`. Takes
   * precedence over the `<option>` children. Property only.
   */
  @property({ attribute: false })
  options?: readonly ListboxOption[];

  /**
   * Which suggestions match the text, without case nor accents: those that
   * `contains` it, those that `starts-with` it, or all of them with `none`,
   * when the application filters them itself.
   */
  @property({ type: String })
  filter: AutocompleteFilter = "contains";

  /**
   * Writes what assistive technologies hear while the user types: the
   * number of suggestions that match the text. Give it in the page's
   * language. Property only.
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

  /** The value of the last `change`: the inner input may fire it again, on blur. */
  #changed?: string;

  /** The options of the last render: other ones have no active option yet. */
  #available?: readonly ListboxOption[];

  /** The last result of `listboxOptions`, computed again when its inputs change. */
  #matching?: {
    options: readonly ListboxOption[];
    value: string;
    filter: AutocompleteFilter;
    result: readonly ListboxOption[];
  };

  /** The suggestions: `options` when set, the `<option>` children otherwise. */
  protected get availableOptions(): readonly ListboxOption[] {
    return this.options ?? this.#listbox.childOptions;
  }

  /** The suggestions that match the text: all of them while it's empty, or with `filter="none"`. */
  protected get listboxOptions(): readonly ListboxOption[] {
    const options = this.availableOptions;
    const cache = this.#matching;
    if (
      cache &&
      cache.options === options &&
      cache.value === this.value &&
      cache.filter === this.filter
    ) {
      return cache.result;
    }
    const query = this.value.trim();
    const result =
      this.filter === "none" || !query
        ? options
        : options.filter((option) => this.optionMatches(option, query));
    this.#matching = { options, value: this.value, filter: this.filter, result };
    return result;
  }

  /** The active suggestion, `undefined` when none. */
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

  /** While the user types: the number of suggestions that match the text. */
  protected override get popupStatus(): string {
    return this.comboboxState.typed ? this.resultsMessage(this.listboxOptions.length) : "";
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.#changed = undefined;
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
        .value=${live(this.value)}
        ?required=${this.required}
        ?readonly=${this.readOnly}
        ?disabled=${this.isDisabled}
        autocomplete=${this.autocomplete ?? "off"}
        aria-invalid=${this.controlInvalid}
        aria-describedby=${this.controlDescribedBy}
        @input=${this.handleInput}
        @change=${this.handleChange}
        @keydown=${this.handleComboboxKeydown}
      />
    `;
  }

  protected renderPopup() {
    return this.#listbox.render();
  }

  /** Renders the content of a suggestion: its label, or its value. Override it for a richer content. */
  protected renderOption(option: ListboxOption, _index: number): unknown {
    return option.label || option.value;
  }

  protected override handleInput(event: Event): void {
    super.handleInput(event);
    this.dispatch({ type: "input" });
  }

  protected override handleChange(): void {
    // Firefox fires `change` on blur after a pick: the value hasn't changed since.
    if (this.value === this.#changed) {
      return;
    }
    this.#changed = this.value;
    super.handleChange();
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
      // No active suggestion: the text is the value, the form may submit.
      this.hidePopup();
    } else if (["Home", "End", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      // Back to the text.
      this.dispatch({ type: "activate", index: -1 });
    }
    return false;
  }

  /**
   * Called when the user picks an enabled suggestion, by a click or Enter.
   * Fires `u-select`, then, unless canceled, fills the field with the
   * suggestion's value, as a user's change: `input`, then `change`. The
   * list closes; the focus stays in the input.
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
        data: option.value,
      }),
    );
    this.handleChange();
  }
}
