import type { PropertyValues } from "lit";
import { RovingFocusController } from "../../controllers/roving-focus.js";
import type { DSBaseElement } from "../../bases/base-element.js";
import { ChoiceGroupBase } from "../../bases/choice-group/choice-group-base.js";
import { Icon } from "../icon/icon.js";
import { Radio } from "../radio/radio.js";

/**
 * A group of radios: the user picks one value among its `radio` children.
 * The group is the form control: it submits `value`, the `value` of the
 * checked radio, under `name`. The `value` attribute is the default value:
 * the form's reset restores it. The label, the hint, the error and the form
 * behavior are those of `ChoiceGroupBase` (ADR 0017).
 *
 * Tab reaches the checked radio, or the first enabled one. The arrow keys
 * move to the next and previous enabled radios and check them, looping at
 * the ends, along the text direction; Space checks the focused radio. A
 * click checks a radio. A `readonly` group keeps its value: the arrow keys
 * move the focus only.
 *
 * Its `input` and `change` events follow each change of `value` by the
 * user, on the group, as those of a native radio.
 *
 * @element u-radio-group
 * @summary A labelled group of radios that takes part in its form.
 * @slot - The `radio` elements of the same registration.
 */
export class RadioGroup extends ChoiceGroupBase {
  static override componentName = "radio-group";

  /** Recognizes its radios and renders its error icon with the components of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [Icon, Radio];

  constructor() {
    super();
    new RovingFocusController(this, {
      items: () => this.items,
      activeIndex: () => this.items.findIndex((radio) => radio.checked),
      axis: () => "both",
      moved: (index) => this.#pick(this.items[index]!),
      // From the properties: a radio sets its `aria-disabled` at its own render.
      isDisabled: (radio) => this.isDisabled || (radio as Radio).disabled,
    });
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
  }

  protected get items(): readonly Radio[] {
    // None on a server: the element has no children there. The radios are
    // checked once the group hydrates.
    return Array.from(this.children ?? []).filter(
      (child): child is Radio => child instanceof Radio,
    );
  }

  protected get groupRole(): string {
    return "radiogroup";
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    // Before the roving tabindex, after this render: Tab reaches the checked radio.
    for (const radio of this.items) {
      radio.checked = this.value !== "" && radio.value === this.value;
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    // After the render: the browser sets the disabled state of a
    // form-associated element when Lit reflects `disabled`.
    for (const radio of this.items) {
      radio.groupDisabled = this.isDisabled;
    }
  }

  #radioOf(event: Event): Radio | undefined {
    const path = event.composedPath();
    return this.items.find((radio) => path.includes(radio));
  }

  #onClick = (event: MouseEvent) => {
    const radio = this.#radioOf(event);
    if (radio) {
      radio.focus();
      this.#pick(radio);
    }
  };

  #onKeydown = (event: KeyboardEvent) => {
    const radio = this.#radioOf(event);
    if (radio && event.key === " ") {
      event.preventDefault();
      this.#pick(radio);
    }
  };

  /** Checks `radio` at the user's request: `input`, then `change`, as a native radio. */
  #pick(radio: Radio): void {
    if (this.readOnly || this.isDisabled || radio.disabled || radio.value === this.value) {
      return;
    }
    this.value = radio.value;
    this.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    this.handleChange();
  }
}
