import { html, nothing, type LitElement, type ReactiveController } from "lit";
import listboxTokens from "./listbox.tokens.css" with { type: "css" };
import type { ListboxOption } from "./listbox.type.js";
import listboxStyles from "./listbox.css" with { type: "css" };

/**
 * The sheets of every component that creates a `ListboxController`: add
 * both to `static styles`, the tokens first. A controller can't adopt a sheet
 * itself. The component also documents the tokens: `@tokens listbox`.
 */
export { listboxStyles, listboxTokens };

export interface ListboxControllerOptions {
  /** `id` of the element of the shadow root that names the list: the label of the field. */
  labelledBy: string;
  /** The options the list shows, in order. Read at each render. */
  options: () => readonly ListboxOption[];
  /** Index of the active option in `options()`, -1 when none. Read at each render. */
  activeIndex: () => number;
  /** The pointer is on the enabled option at `index`. */
  activate: (index: number) => void;
  /** The user picked an enabled option, by a click. */
  select: (option: ListboxOption) => void;
  /**
   * Whether the list takes several choices. It then has
   * `aria-multiselectable`, and `aria-selected` says the choice of each
   * option, from `selected()`. Otherwise, `aria-selected` marks the active
   * option. `false` by default.
   */
  multiple?: () => boolean;
  /** For a list of several choices: whether `option` is chosen. */
  selected?: (option: ListboxOption, index: number) => boolean;
  /** Renders the content of an option. Default: its label, or its value. */
  renderOption?: (option: ListboxOption, index: number) => unknown;
  /** `id` of the list in the shadow root. Default: `listbox`. */
  id?: string;
}

/** An option of the light DOM, as data. */
function optionOf(element: HTMLOptionElement): ListboxOption {
  return {
    value: element.value,
    label: element.label,
    disabled: element.disabled,
    selected: element.defaultSelected,
  };
}

/**
 * Reactive controller: a list of options in the host's shadow root,
 * `role="listbox"`, whose active option follows the keyboard while the focus
 * stays on a control: the input of an autocomplete, the button of a select
 * (ADR 0009). The control takes `activeDescendant` as its
 * `aria-activedescendant`, and `id` as its `aria-controls`.
 *
 * The controller connects a list to the DOM; it holds no state of its own.
 * The host owns the active index (`comboboxReducer()`, or
 * `moveIndex()` of `state/collection.ts`) and the options.
 *
 * It also reads the `<option>` children of the host, as data, in
 * `childOptions`, and never changes them: a framework keeps rendering them.
 * Either way, the list renders its own copies, in the shadow root of the
 * control: `aria-activedescendant` only reaches an element of its own tree
 * (ADR 0007). `render()` also renders the hidden slot of these children.
 *
 * On a server, the host has no children to read: a host rendered there
 * (ADR 0014) reads them after its first render, which then matches the
 * server's.
 */
export class ListboxController implements ReactiveController {
  readonly #host: LitElement;
  readonly #options: ListboxControllerOptions;

  /** The `<option>` children of the host, as data. */
  #childOptions: readonly ListboxOption[] = [];

  /** Reads the `<option>` children again when they change. */
  #observer?: MutationObserver;

  /** The active index of the last render: the list scrolls when it changes. */
  #rendered = -1;

  constructor(host: LitElement, options: ListboxControllerOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** `id` of the list: the `aria-controls` of its control. */
  get id(): string {
    return this.#options.id ?? "listbox";
  }

  /** The `<option>` children of the host, as data: its options when it has no `options` property. */
  get childOptions(): readonly ListboxOption[] {
    return this.#childOptions;
  }

  /** The active option, `undefined` when none. */
  get activeOption(): ListboxOption | undefined {
    const index = this.#options.activeIndex();
    return index < 0 ? undefined : this.#options.options()[index];
  }

  /** For the control: its `aria-activedescendant`, the `id` of the active option. */
  get activeDescendant(): string | typeof nothing {
    return this.activeOption ? this.#optionId(this.#options.activeIndex()) : nothing;
  }

  hostConnected(): void {
    // A shadow root before the first render: the server rendered the host,
    // without its children. Read them once its first render has matched.
    if (this.#host.shadowRoot && !this.#host.hasUpdated) {
      void this.#host.updateComplete.then(() => this.#readChildren());
    } else {
      this.#readChildren();
    }
    // The children, not the host's own attributes (`disabled`).
    this.#observer ??= new MutationObserver((records) => {
      if (records.some(({ type, target }) => type === "childList" || target !== this.#host)) {
        this.#readChildren();
      }
    });
    this.#observer.observe(this.#host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value", "label", "disabled"],
    });
  }

  hostDisconnected(): void {
    this.#observer?.disconnect();
  }

  hostUpdated(): void {
    const active = this.#options.activeIndex();
    if (active !== this.#rendered) {
      this.#rendered = active;
      this.#scrollToActive();
    }
  }

  /**
   * Renders the list, `role="listbox"`, and the hidden slot of the
   * `<option>` children. A press on the list keeps the focus on the control;
   * the pointer makes the option under it active.
   */
  render(): unknown {
    const active = this.#options.activeIndex();
    const selected = this.#options.multiple?.() ? this.#options.selected : undefined;
    const renderOption =
      this.#options.renderOption ?? ((option: ListboxOption) => option.label || option.value);
    return html`
      <div
        part="listbox"
        class="listbox"
        id=${this.id}
        role="listbox"
        aria-labelledby=${this.#options.labelledBy}
        aria-multiselectable=${selected ? "true" : nothing}
        @pointerdown=${this.#keepFocus}
        @pointermove=${this.#activateUnderPointer}
        @click=${this.#selectUnderPointer}
      >
        ${this.#options
          .options()
          .map(
            (option, index) => html`
              <div
                part="option"
                class="option"
                id=${this.#optionId(index)}
                role="option"
                data-index=${index}
                aria-selected=${
                  (selected ? selected(option, index) : index === active) ? "true" : "false"
                }
                data-active=${index === active ? "" : nothing}
                aria-disabled=${option.disabled ? "true" : nothing}
              >
                ${renderOption(option, index)}
              </div>
            `,
          )}
      </div>
      <slot hidden></slot>
    `;
  }

  /** `option-<index>`, after the `id` of a list that has its own. */
  #optionId(index: number): string {
    return `${this.#options.id ? `${this.#options.id}-` : ""}option-${index}`;
  }

  #readChildren(): void {
    const children = Array.from(this.#host.children).filter(
      (child): child is HTMLOptionElement => child instanceof HTMLOptionElement,
    );
    // Without any child before nor after, the host has nothing to render again.
    if (children.length > 0 || this.#childOptions.length > 0) {
      this.#childOptions = children.map(optionOf);
      this.#host.requestUpdate();
    }
  }

  /** The index of the enabled option under the pointer, -1 when none. */
  #indexAt(event: Event): number {
    const element = (event.target as Element).closest<HTMLElement>('[role="option"]');
    const index = Number(element?.dataset.index ?? -1);
    return this.#options.options()[index]?.disabled ? -1 : index;
  }

  #keepFocus = (event: PointerEvent) => {
    event.preventDefault();
  };

  #activateUnderPointer = (event: PointerEvent) => {
    const index = this.#indexAt(event);
    if (index >= 0 && index !== this.#options.activeIndex()) {
      this.#options.activate(index);
    }
  };

  #selectUnderPointer = (event: MouseEvent) => {
    const option = this.#options.options()[this.#indexAt(event)];
    if (option) {
      this.#options.select(option);
    }
  };

  /** Scrolls the list, not the page, to show the active option. */
  #scrollToActive(): void {
    const root = this.#host.renderRoot;
    const list = root.querySelector<HTMLElement>(`#${this.id}`);
    const item = root.querySelector<HTMLElement>(`#${this.#optionId(this.#options.activeIndex())}`);
    if (!list || !item) {
      return;
    }
    // The padding stays visible around the first and last options.
    const box = list.getBoundingClientRect();
    const { paddingTop, paddingBottom } = getComputedStyle(list);
    const top = box.top + list.clientTop + parseFloat(paddingTop);
    const bottom = box.top + list.clientTop + list.clientHeight - parseFloat(paddingBottom);
    const { top: itemTop, bottom: itemBottom } = item.getBoundingClientRect();
    if (itemTop < top) {
      list.scrollTop -= top - itemTop;
    } else if (itemBottom > bottom) {
      list.scrollTop += itemBottom - bottom;
    }
  }
}
