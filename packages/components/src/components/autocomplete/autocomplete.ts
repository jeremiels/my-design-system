import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { ListboxSelectEvent } from "../../events/listbox-select.js";
import { withListbox } from "../../mixins/withListbox.js";
import { ComboboxBase } from "../combobox/combobox-base.js";
import type { ComboboxEntry } from "../combobox/combobox.type.js";
import type { ListboxOption } from "../listbox/listbox.type.js";
import type { AutocompleteFilter } from "./autocomplete.type.js";

/** Text compared without case nor accents: "Évry" matches "evry". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

/**
 * A text field with suggestions: the list below the input shows the
 * suggestions that match the text, and the user picks one or keeps typing.
 * The value is the text, free: a suggestion only fills it, as `<input list>`
 * does. The label, the hint, the error and the form behavior are those of
 * `FieldBase`; the popup is that of `ComboboxBase`.
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
export class Autocomplete extends withListbox(ComboboxBase) {
  static override componentName = "autocomplete";

  /**
   * Which suggestions match the text, without case nor accents: those that
   * `contains` it, those that `starts-with` it, or all of them with `none`,
   * when the application filters them itself.
   */
  @property({ type: String })
  filter: AutocompleteFilter = "contains";

  /** Whether the user has typed since the list last closed: new options open it. */
  #typed = false;

  /** The value of the last `change`: the inner input may fire it again, on blur. */
  #changed?: string;

  /** The last result of `listboxOptions`, computed again when its inputs change. */
  #matching?: {
    options: readonly ListboxOption[];
    value: string;
    filter: AutocompleteFilter;
    result: readonly ListboxOption[];
  };

  /** The suggestions that match the text: all of them while it's empty, or with `filter="none"`. */
  protected override get listboxOptions(): readonly ListboxOption[] {
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

  /**
   * Whether `option` matches `query`, the trimmed text: its label contains
   * it, or starts with it, without case nor accents. Override it for
   * another comparison; `filter="none"` never calls it.
   */
  protected optionMatches(option: ListboxOption, query: string): boolean {
    const label = normalize(option.label || option.value);
    const text = normalize(query);
    return this.filter === "starts-with" ? label.startsWith(text) : label.includes(text);
  }

  protected override get hasPopupContent(): boolean {
    return this.listboxOptions.length > 0;
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.#changed = undefined;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    // While the user types, the list follows the suggestions: it opens when
    // some match, an answer from a server for instance, and closes when
    // none does (ComboboxBase).
    if (this.#typed && !this.open && this.value && this.#focused) {
      this.showPopup();
    }
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
        aria-activedescendant=${this.activeDescendant}
        .value=${live(this.value)}
        ?required=${this.required}
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
    return this.renderListbox();
  }

  protected override handleInput(event: Event): void {
    super.handleInput(event);
    this.#typed = true;
    this.moveActive("none");
    if (!this.value) {
      this.hidePopup();
    }
  }

  protected override handleChange(): void {
    // Firefox fires `change` on blur after a pick: the value hasn't changed since.
    if (this.value === this.#changed) {
      return;
    }
    this.#changed = this.value;
    super.handleChange();
  }

  protected override hidePopup(): void {
    this.#typed = false;
    // Closed, the list has no active option for aria-activedescendant.
    this.moveActive("none");
    super.hidePopup();
  }

  protected override enterPopup(entry: ComboboxEntry): void {
    this.moveActive(entry);
  }

  protected override handlePopupKeydown(event: KeyboardEvent): boolean {
    if (this.handleListboxKeydown(event)) {
      return true;
    }
    if (event.key === "Enter") {
      // No active suggestion: the text is the value, the form may submit.
      this.hidePopup();
    } else if (["Home", "End", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      // Back to the text.
      this.moveActive("none");
    }
    return false;
  }

  /**
   * Fires `u-select`, then, unless canceled, fills the field with the
   * suggestion's value, as a user's change: `input`, then `change`. The
   * list closes; the focus stays in the input.
   */
  protected override selectOption(option: ListboxOption): void {
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

  /** Whether the input has the focus. */
  get #focused(): boolean {
    return this.shadowRoot?.activeElement === this.renderRoot.querySelector("#control");
  }
}
