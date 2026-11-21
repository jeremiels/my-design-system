import { property } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import type { FormValue } from "../../mixins/withFormControl.js";
import type { DSBaseElement } from "../base-element.js";
import { Checkbox } from "../checkbox/checkbox.js";
import { ChoiceGroupBase } from "../choice-group/choice-group-base.js";
import { Icon } from "../icon/icon.js";

/**
 * A group of checkboxes: the user checks any number of options among its
 * `checkbox` children. The group has the label, the hint and the error of
 * its options; the label, the hint, the error and the form behavior are
 * those of `ChoiceGroupBase` (ADR 0017).
 *
 * The group submits the value of each checked checkbox under `name`, as a
 * `<select multiple>`: its checkboxes have no `name` of their own. `values`
 * holds them; `value`, the first one. The `checked` attribute of each
 * checkbox is its default state: the form's reset restores it.
 *
 * A `required` group can't be submitted while no checkbox is checked. A
 * `disabled` or `readonly` group disables its checkboxes, or keeps their
 * state.
 *
 * Its checkboxes fire their own `input` and `change` events: they reach the
 * group, and the page.
 *
 * @element u-checkbox-group
 * @summary A labelled group of checkboxes that takes part in its form.
 * @slot - The `checkbox` elements of the same registration.
 */
export class CheckboxGroup extends ChoiceGroupBase {
  static override componentName = "checkbox-group";

  /** Recognizes its checkboxes and renders its error icon with the components of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [Icon, Checkbox];

  /** The first checked value, as the `value` of a `<select multiple>`. Read it; set `values`. */
  @property({ type: String })
  override value = "";

  constructor() {
    super();
    // A checkbox the user changes: the group's values, its error.
    this.addEventListener("input", (event) => {
      if (event.target !== this) {
        this.requestUpdate();
      }
    });
    this.addEventListener("change", (event) => {
      if (event.target !== this) {
        this.markInteracted();
      }
    });
  }

  /**
   * The values of the checked checkboxes, in their order. Set it to check
   * the checkboxes whose value it holds, and uncheck the others. Property
   * only.
   */
  get values(): string[] {
    return this.items.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
  }
  set values(values: readonly string[]) {
    for (const checkbox of this.items) {
      checkbox.checked = values.includes(checkbox.value);
    }
    this.requestUpdate();
  }

  protected get items(): readonly Checkbox[] {
    // None on a server: the element has no children there.
    return Array.from(this.children ?? []).filter(
      (child): child is Checkbox => child instanceof Checkbox,
    );
  }

  protected get groupRole(): string {
    return "group";
  }

  /** One entry per checked value, under `name`. */
  protected override get formValue(): FormValue {
    if (!this.name) {
      return null;
    }
    const data = new FormData();
    for (const value of this.values) {
      data.append(this.name, value);
    }
    return data;
  }

  /** A missing value: `required`, and no checkbox checked. */
  protected override syncValidity(): void {
    this.syncValueValidity(this.required && this.values.length === 0, this.focusTarget);
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    // The checkboxes reset themselves after the group, in tree order.
    this.requestUpdate();
  }

  /** The first checkbox Tab reaches. */
  protected override get focusTarget(): HTMLElement | undefined {
    return this.items.find((checkbox) => !checkbox.disabled);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    this.value = this.values[0] ?? "";
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    // After the render: the browser sets the disabled state of a
    // form-associated element when Lit reflects `disabled`.
    for (const checkbox of this.items) {
      checkbox.groupDisabled = this.isDisabled;
      checkbox.groupReadOnly = this.readOnly;
    }
  }
}
