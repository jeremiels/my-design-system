import { nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { html } from "lit/static-html.js";
import { ListboxController, listboxStyles, listboxTokens } from "../../controllers/listbox.js";
import type { ListboxOption } from "../../controllers/listbox.type.js";
import { LoadController } from "../../controllers/load.js";
import { ListboxSelectEvent } from "../../events/listbox-select.js";
import { collectionKeyMove } from "../../state/collection.js";
import { normalizeText } from "../../state/typeahead.js";
import { Spinner } from "../../components/spinner/spinner.js";
import { ComboboxBase } from "../combobox/combobox-base.js";
import { fieldIds } from "../field/field-base.js";
import type { ComboboxFilter, OptionsRequest } from "./editable-combobox.type.js";

/** The options that match the text: those the list shows, and how many match. */
interface Matches {
  readonly shown: readonly ListboxOption[];
  readonly count: number;
}

/**
 * Shared base of the editable comboboxes of the APG: a text input, and a
 * list below it of the options that match the text. Abstract: `autocomplete`
 * keeps the text as its value, `combobox` restricts its value to the options
 * (ADR 0025). The label, the hint, the error and the form behavior are those
 * of `FieldBase`; the popup and its state are those of `ComboboxBase`; the
 * list is that of a `ListboxController`.
 *
 * The options are `options`, or else the `<option>` children of the field.
 * The list shows `maxOptions` of them at most, 100 by default, and says how
 * many it doesn't show: the user types more to narrow it (ADR 0026).
 *
 * The options can come from a server: `loadOptions` receives the text, 300
 * milliseconds after the user's last change, and resolves with the
 * options, shown as they come. A newer text aborts the request. While the
 * text is empty, or until the first answer, the list shows `options`. With
 * `filter="none"`, the application filters `options` itself instead: it
 * listens to `input`, reads `inputValue`, and sets `options`. Either way,
 * new options open the list while the user types.
 *
 * Keys, list open: ArrowDown and ArrowUp move to the next and previous
 * option, looping at the ends; Enter picks the active one; Escape closes
 * the list and keeps the text; Home, End and the other keys edit the text.
 *
 * While the user types, a live region announces the number of options that
 * match: `resultsMessage` writes it. A request that lasts more than half a
 * second shows and announces `loadingLabel`.
 *
 * The browser's own suggestions (`autocomplete`) are off by default: they
 * would cover the list. Give `autocomplete` to have both.
 *
 * @slot - The options as `<option>` elements, when `options` isn't set: their `value`, their `label` or text, and `disabled`. They aren't shown: the list renders copies of them.
 * @csspart input - The native `<input>`, the combobox.
 * @csspart listbox - The list of options, in the popup.
 * @csspart option - An option. The active one has `aria-selected="true"`, a disabled one `aria-disabled="true"`.
 * @csspart status - The line at the end of the list: a `spinner` and `loadingLabel` during a slow request, or `resultsMessage` when the list doesn't show every option. Hidden from assistive technologies, which hear the live region.
 * @fires {ListboxSelectEvent} u-select - When the user picks an option, before the field takes its value. Its `option` is the option. Cancelable: `preventDefault()` keeps the value.
 * @tokens listbox - Its list's tokens (`@cssprop`), shared by every list of options, from `@unicorne/tokens` (`src/component/listbox/`): `npm run analyze` documents them.
 */
export abstract class EditableComboboxBase extends ComboboxBase {
  /** Renders the spinner of its status line with the `spinner` of its own registration. */
  static override dependencies = [...super.dependencies, Spinner];

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
   * The largest number of options the list shows, the first ones that
   * match: the user types more to reach the others. `Infinity` shows them
   * all.
   */
  @property({ type: Number, attribute: "max-options" })
  maxOptions = 100;

  /**
   * Loads the options for the text the user typed, from a server for
   * instance: they replace `options`, as they are, without `filter`. Called
   * 300 milliseconds after the user's last change of the text, unless it
   * is empty. Abort the work when `signal` aborts: a newer text replaces it.
   * A rejection shows `options` again, and reaches the page's error
   * handlers: catch it to show an error to the user. Property only.
   */
  @property({ attribute: false })
  loadOptions?: (request: OptionsRequest) => Promise<readonly ListboxOption[]>;

  /** What the status line shows and the live region announces while a request lasts. */
  @property({ type: String, attribute: "loading-label" })
  loadingLabel = "Loading…";

  /**
   * Writes the number of options that match the text: the live region
   * announces it while the user types, and the status line shows it when
   * the list shows only `shown` of them. Give it in the page's language.
   * Property only.
   */
  @property({ attribute: false })
  resultsMessage: (count: number, shown: number) => string = (count, shown) => {
    const results =
      count === 0 ? "No suggestions" : count === 1 ? "1 suggestion" : `${count} suggestions`;
    return shown < count ? `${results}, ${shown} shown` : results;
  };

  #listbox = new ListboxController(this, {
    labelledBy: fieldIds.label,
    options: () => this.listboxOptions,
    activeIndex: () => this.comboboxState.activeIndex,
    activate: (index) => this.dispatch({ type: "activate", index }),
    select: (option) => this.selectOption(option),
    renderOption: (option, index) => this.renderOption(option, index),
    busy: () => this.#loader.loading,
    status: () => this.#status,
  });

  #loader = new LoadController<readonly ListboxOption[]>(this, {
    delay: () => this.loadDelay,
  });

  /** The text of the last load, or of the last change by the application. */
  #loadText = "";

  /** The options of the last render: other ones have no active option yet. */
  #available?: readonly ListboxOption[];

  /** The last result of `#matches`, computed again when its inputs change. */
  #matching?: {
    options: readonly ListboxOption[];
    query: string;
    filter: ComboboxFilter;
    max: number;
    result: Matches;
  };

  /** The last normalized query, not normalized again for each option. */
  #query = { text: "", normalized: "" };

  /** The normalized labels, not normalized again at each change of the text. */
  #labels = new WeakMap<ListboxOption, string>();

  /** The text of the input: what the user types, or the text of the value. Read-only. */
  get inputValue(): string {
    return this.controlText;
  }

  /** Whether `loadOptions` is loading the options for the text. Read-only. */
  get loading(): boolean {
    return this.#loader.loading;
  }

  /**
   * The options: those `loadOptions` gave for the text, or else `options`
   * when set, or else the `<option>` children.
   */
  protected get availableOptions(): readonly ListboxOption[] {
    return this.#loader.value ?? this.options ?? this.#listbox.childOptions;
  }

  /** Milliseconds between the user's last change of the text and `loadOptions`: 300. */
  protected get loadDelay(): number {
    return 300;
  }

  /** The text the options match: that of the input by default. */
  protected get filterText(): string {
    return this.controlText;
  }

  /**
   * The options the list shows: the first `maxOptions` that match
   * `filterText`. All of them match while it's empty, with `filter="none"`,
   * and when `loadOptions` gave them.
   */
  protected get listboxOptions(): readonly ListboxOption[] {
    return this.#matches.shown;
  }

  get #matches(): Matches {
    const options = this.availableOptions;
    const query = this.filterText.trim();
    const filter = this.#loader.value ? "none" : this.filter;
    const max = this.maxOptions >= 1 ? this.maxOptions : Infinity;
    const cache = this.#matching;
    if (
      cache &&
      cache.options === options &&
      cache.query === query &&
      cache.filter === filter &&
      cache.max === max
    ) {
      return cache.result;
    }
    const matching =
      filter === "none" || !query
        ? options
        : options.filter((option) => this.optionMatches(option, query));
    const result = {
      shown: matching.length > max ? matching.slice(0, max) : matching,
      count: matching.length,
    };
    this.#matching = { options, query, filter, max, result };
    return result;
  }

  /** What the status line shows: a spinner and `loadingLabel` during a slow request, or else the count of a capped list. */
  get #status(): unknown {
    if (this.#loader.slow) {
      const spinner = this.tagFor(Spinner);
      return html`<${spinner} size="small" label=${this.loadingLabel}></${spinner}
        >${this.loadingLabel}`;
    }
    const { shown, count } = this.#matches;
    return shown.length < count ? this.resultsMessage(count, shown.length) : nothing;
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
    let label = this.#labels.get(option);
    if (label === undefined) {
      label = normalizeText(option.label || option.value);
      this.#labels.set(option, label);
    }
    if (this.#query.text !== query) {
      this.#query = { text: query, normalized: normalizeText(query) };
    }
    const text = this.#query.normalized;
    return this.filter === "starts-with" ? label.startsWith(text) : label.includes(text);
  }

  /** Options to show, or a slow request: the list opens to say it loads. */
  protected override get hasPopupContent(): boolean {
    return this.listboxOptions.length > 0 || this.#loader.slow;
  }

  protected override get popupItems(): readonly ListboxOption[] {
    return this.listboxOptions;
  }

  protected override get comboboxControls(): string {
    return this.#listbox.id;
  }

  /**
   * While the user types: the number of options that match the text, once
   * they are loaded. A slow request: `loadingLabel`.
   */
  protected override get popupStatus(): string {
    if (!this.comboboxState.typed) {
      return "";
    }
    if (this.#loader.pending) {
      return this.#loader.slow ? this.loadingLabel : "";
    }
    const { shown, count } = this.#matches;
    return this.resultsMessage(count, shown.length);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    this.#syncLoad();
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

  /**
   * A new text: the user's loads its options, after the delay. An empty
   * text, or one the application gave, shows `options` again.
   */
  #syncLoad(): void {
    const text = this.filterText.trim();
    if (text === this.#loadText) {
      return;
    }
    this.#loadText = text;
    const loadOptions = this.loadOptions;
    if (!loadOptions || !text || !this.comboboxState.typed) {
      this.#loader.clear();
      return;
    }
    this.#loader.load((signal) => loadOptions({ text, signal }));
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
