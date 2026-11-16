import { html, nothing, type LitElement, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import listboxTokens from "../components/listbox/listbox.tokens.css" with { type: "css" };
import type { ListboxMove, ListboxOption } from "../components/listbox/listbox.type.js";
import type { AbstractConstructor, Constructor } from "../types/common.js";
import listboxStyles from "./withListbox.css" with { type: "css" };

export declare class ListboxInterface {
  options?: readonly ListboxOption[];
  /** The options: `options` when set, the `<option>` children otherwise. */
  protected get availableOptions(): readonly ListboxOption[];
  /** The options the list shows and the keyboard moves through. */
  protected get listboxOptions(): readonly ListboxOption[];
  /** Index of the active option in `listboxOptions`, -1 when none. */
  protected activeIndex: number;
  /** The active option, `undefined` when none. */
  protected get activeOption(): ListboxOption | undefined;
  /** For the control: its `aria-activedescendant`. */
  protected get activeDescendant(): string | typeof nothing;
  /** Renders the list of `listboxOptions`. */
  protected renderListbox(): unknown;
  /** Renders the content of an option. */
  protected renderOption(option: ListboxOption, index: number): unknown;
  /** Moves the active option. */
  protected moveActive(to: ListboxMove): void;
  /** Handles the list's keys. Returns whether it handled `event`. */
  protected handleListboxKeydown(event: KeyboardEvent): boolean;
  /** Called when the user picks an option. */
  protected selectOption(option: ListboxOption): void;
}

/** An option of the light DOM, as data. */
function optionOf(element: HTMLOptionElement): ListboxOption {
  return { value: element.value, label: element.label, disabled: element.disabled };
}

/**
 * Mixin: a list of options in the shadow root, `role="listbox"`, whose
 * active option follows the arrow keys while the focus stays on a control:
 * the input of an autocomplete, the button of a select. The control gets
 * the list's `aria-activedescendant`.
 *
 * The options are `options`, or else the `<option>` children of the host.
 * The mixin reads those children and never changes them: a framework keeps
 * rendering them. Either way, the list renders its own copies, in the shadow
 * root of the control. `aria-activedescendant` only reaches an element of
 * its own tree (ADR 0007, ADR 0009).
 *
 * `renderListbox()` renders the list with `id="listbox"`, named by the
 * element `#label` of the shadow root (the label of `FieldBase`). Each option
 * has `id="option-<index>"`.
 */
export function withListbox<T extends AbstractConstructor<LitElement>>(Base: T) {
  abstract class ListboxElement extends Base {
    static styles = [
      (Base as unknown as typeof LitElement).styles ?? [],
      listboxTokens,
      listboxStyles,
    ];

    /**
     * The options, as data: `{ value, label?, disabled? }`. Takes precedence
     * over the `<option>` children. Property only.
     */
    @property({ attribute: false })
    options?: readonly ListboxOption[];

    /** The `<option>` children, as data. */
    @state()
    private childOptions: readonly ListboxOption[] = [];

    @state()
    protected activeIndex = -1;

    /** Reads the `<option>` children again when they change. */
    #observer?: MutationObserver;

    connectedCallback(): void {
      super.connectedCallback();
      this.#readChildren();
      // The children, not the host's own attributes (`disabled`).
      this.#observer ??= new MutationObserver((records) => {
        if (records.some(({ type, target }) => type === "childList" || target !== this)) {
          this.#readChildren();
        }
      });
      this.#observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["value", "label", "disabled"],
      });
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      this.#observer?.disconnect();
    }

    protected get availableOptions(): readonly ListboxOption[] {
      return this.options ?? this.childOptions;
    }

    /**
     * The options the list shows and the keyboard moves through:
     * `availableOptions`. Override it to filter them.
     */
    protected get listboxOptions(): readonly ListboxOption[] {
      return this.availableOptions;
    }

    protected get activeOption(): ListboxOption | undefined {
      return this.activeIndex < 0 ? undefined : this.listboxOptions[this.activeIndex];
    }

    protected get activeDescendant(): string | typeof nothing {
      return this.activeOption ? `option-${this.activeIndex}` : nothing;
    }

    protected willUpdate(changedProperties: PropertyValues): void {
      super.willUpdate(changedProperties);
      // New options: the index would point at another one.
      if (changedProperties.has("options") || changedProperties.has("childOptions")) {
        this.activeIndex = -1;
      }
    }

    /**
     * Renders the list of `listboxOptions`, `role="listbox"`, and the hidden
     * slot of the `<option>` children. A press on the list keeps the focus
     * on the control; the pointer makes the option under it active.
     */
    protected renderListbox(): unknown {
      return html`
        <div
          part="listbox"
          class="listbox"
          id="listbox"
          role="listbox"
          aria-labelledby="label"
          @pointerdown=${this.#keepFocus}
          @pointermove=${this.#activateUnderPointer}
          @click=${this.#selectUnderPointer}
        >
          ${this.listboxOptions.map(
            (option, index) => html`
              <div
                part="option"
                class="option"
                id="option-${index}"
                role="option"
                data-index=${index}
                aria-selected=${index === this.activeIndex ? "true" : "false"}
                aria-disabled=${option.disabled ? "true" : nothing}
              >
                ${this.renderOption(option, index)}
              </div>
            `,
          )}
        </div>
        <slot hidden></slot>
      `;
    }

    /** Renders the content of an option: its label, or its value. Override it for a richer content. */
    protected renderOption(option: ListboxOption, _index: number): unknown {
      return option.label || option.value;
    }

    /**
     * Moves the active option: to the next or previous enabled one, looping
     * at the ends, to the first or last enabled one, or to none. Scrolls the
     * list to it.
     */
    protected moveActive(to: ListboxMove): void {
      const enabled = this.listboxOptions.flatMap((option, index) =>
        option.disabled ? [] : [index],
      );
      if (to === "none" || enabled.length === 0) {
        this.activeIndex = -1;
        return;
      }
      const position = enabled.indexOf(this.activeIndex);
      let next: number;
      if (to === "first" || (to === "next" && (position < 0 || position === enabled.length - 1))) {
        next = enabled[0];
      } else if (to === "last" || (to === "previous" && position <= 0)) {
        next = enabled[enabled.length - 1];
      } else {
        next = enabled[position + (to === "next" ? 1 : -1)];
      }
      this.activeIndex = next;
      void this.updateComplete.then(() => this.#scrollToActive());
    }

    /**
     * Handles ArrowDown and ArrowUp (the next and previous option) and
     * Enter (picks the active option). Returns whether it handled `event`:
     * the caller then prevents its default.
     */
    protected handleListboxKeydown(event: KeyboardEvent): boolean {
      switch (event.key) {
        case "ArrowDown":
          this.moveActive("next");
          return true;
        case "ArrowUp":
          this.moveActive("previous");
          return true;
        case "Enter": {
          const option = this.activeOption;
          if (!option || option.disabled) {
            return false;
          }
          this.selectOption(option);
          return true;
        }
        default:
          return false;
      }
    }

    /**
     * Called when the user picks an enabled option, by a click or Enter.
     * Does nothing by default: the component gives it its meaning.
     */
    protected selectOption(_option: ListboxOption): void {}

    #readChildren(): void {
      const children = Array.from(this.children).filter(
        (child): child is HTMLOptionElement => child instanceof HTMLOptionElement,
      );
      this.childOptions = children.map(optionOf);
    }

    /** The index of the option under the pointer, -1 when none. */
    #indexAt(event: Event): number {
      const element = (event.target as Element).closest<HTMLElement>('[role="option"]');
      const index = Number(element?.dataset.index ?? -1);
      return this.listboxOptions[index]?.disabled ? -1 : index;
    }

    #keepFocus = (event: PointerEvent) => {
      event.preventDefault();
    };

    #activateUnderPointer = (event: PointerEvent) => {
      const index = this.#indexAt(event);
      if (index >= 0 && index !== this.activeIndex) {
        this.activeIndex = index;
      }
    };

    #selectUnderPointer = (event: MouseEvent) => {
      const option = this.listboxOptions[this.#indexAt(event)];
      if (option) {
        this.selectOption(option);
      }
    };

    /** Scrolls the list, not the page, to show the active option. */
    #scrollToActive(): void {
      const list = this.renderRoot.querySelector<HTMLElement>("#listbox");
      const item = this.renderRoot.querySelector<HTMLElement>(`#option-${this.activeIndex}`);
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
  // Through `unknown`: protected members make the interface nominal.
  return ListboxElement as unknown as Constructor<ListboxInterface> & T;
}
