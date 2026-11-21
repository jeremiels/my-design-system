import type { LitElement, PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type { AbstractConstructor, Constructor } from "../types/common.js";
import type { DisabledInterface } from "./withDisabled.js";
import type { InternalsInterface } from "./withInternals.js";

/** What a form control submits: `setFormValue()` of `ElementInternals`. */
export type FormValue = string | File | FormData | null;

export declare class FormControlInterface {
  name: string;
  value: string;
  required: boolean;
  readOnly: boolean;
  readonly form: HTMLFormElement | null;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  /** The message of `setCustomValidity()`, `""` when none. */
  protected get customValidity(): string;
  /** What the form submits under `name`: `value` by default. */
  protected get formValue(): FormValue;
  /**
   * Gives the host its validity, after each render and after
   * `setCustomValidity()`. By default, only the message of
   * `setCustomValidity()` makes it invalid, unless it is read-only. A
   * component with a native control copies the control's validity instead
   * (`FieldBase`).
   */
  protected updateValidity(): void;
  /** @internal */
  formResetCallback(): void;
  /** @internal */
  formStateRestoreCallback(state: FormValue, mode?: "restore" | "autocomplete"): void;
}

/**
 * Mixin: makes a component a form control, like a native `<input>`. It
 * submits `formValue` under `name`, takes part in the form's validation,
 * follows the form's reset and the browser's restoration of the page, and a
 * `<fieldset disabled>` (`withDisabled`).
 *
 * Apply it over `withInternals` and `withDisabled`: it reads `this.internals`,
 * and a form control can be disabled.
 *
 * A read-only control is barred from validation by the browser, as a native
 * one: `readonly` is reflected. The component renders its native control
 * `readonly` too, and changes nothing from the user's input.
 */
export function withFormControl<
  T extends AbstractConstructor<LitElement & InternalsInterface & DisabledInterface>,
>(Base: T) {
  abstract class FormControlElement extends Base {
    /** Takes part in its form: value, validity, reset, `<fieldset disabled>`. */
    static formAssociated = true;

    /** Name of the value in the form's data. Reflected: the form reads the attribute. */
    @property({ type: String, reflect: true })
    name = "";

    /**
     * The value, submitted with the form. The `value` attribute is the
     * default value: the form's reset restores it.
     */
    @property({ type: String })
    value = "";

    /** The form can't be submitted while the control is empty. */
    @property({ type: Boolean })
    required = false;

    /**
     * The user can't change the value; the form still submits it. Barred
     * from validation, as a native control: `required` doesn't apply.
     * Reflected to `readonly`: the browser reads the attribute.
     */
    @property({ type: Boolean, reflect: true, attribute: "readonly" })
    readOnly = false;

    #customValidity = "";

    /** The form of the control, or `null`. */
    get form(): HTMLFormElement | null {
      return this.internals?.form ?? null;
    }

    /** The validity of the value, as on a native control. */
    get validity(): ValidityState {
      return this.internals!.validity;
    }

    /** The message of the first constraint the value fails, `""` when valid. */
    get validationMessage(): string {
      return this.internals!.validationMessage;
    }

    /** Whether the control is validated with its form: `false` while disabled or read-only. */
    get willValidate(): boolean {
      return this.internals!.willValidate;
    }

    /** Whether the value is valid. If not, fires `invalid`. */
    checkValidity(): boolean {
      return this.internals!.checkValidity();
    }

    /** As `checkValidity()`, and the browser reports the error, focusing the control. */
    reportValidity(): boolean {
      return this.internals!.reportValidity();
    }

    /**
     * Makes the value invalid with this message, as on a native control: a
     * check of the application, such as a username already taken. `""` makes
     * the value valid again.
     */
    setCustomValidity(message: string): void {
      this.#customValidity = message;
      if (this.hasUpdated) {
        this.updateValidity();
      }
    }

    protected get customValidity(): string {
      return this.#customValidity;
    }

    protected get formValue(): FormValue {
      return this.value;
    }

    protected updateValidity(): void {
      if (this.#customValidity && !this.readOnly) {
        this.internals?.setValidity({ customError: true }, this.#customValidity);
      } else {
        this.internals?.setValidity({});
      }
    }

    /** @internal */
    formResetCallback(): void {
      this.value = this.getAttribute("value") ?? "";
    }

    /** @internal */
    formStateRestoreCallback(state: FormValue, _mode?: "restore" | "autocomplete"): void {
      if (typeof state === "string") {
        this.value = state;
      }
    }

    protected override updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);
      this.internals?.setFormValue(this.formValue);
      this.updateValidity();
    }
  }
  // Through `unknown`: protected members make the interface nominal.
  return FormControlElement as unknown as Constructor<FormControlInterface> & T;
}
