import { nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { withInternals } from "../../mixins/withInternals.js";
import { DSBaseElement } from "../base-element.js";
import { Icon } from "../icon/icon.js";
import fieldBaseStyles from "./field-base.css" with { type: "css" };
import fieldTokens from "./field.tokens.css" with { type: "css" };

/** The native control of a field. */
type FieldControl = HTMLInputElement | HTMLTextAreaElement;

/**
 * Shared base of the form fields, `text-field` and `textarea`: a label, an
 * optional hint, a native control and its error message. Abstract: extend
 * `TextField` or `Textarea`, or write a field with `renderControl()`.
 *
 * A field takes part in its form like a native control: it submits `value`
 * under `name`, blocks the submission while invalid, follows the form's
 * reset and a `<fieldset disabled>`.
 *
 * Validation is the browser's, on the native control, plus
 * `setCustomValidity()`. The error shows once the user has changed the value
 * and left the field, or once validation has run (a submission attempt,
 * `checkValidity()`, `reportValidity()`), then follows each keystroke. The
 * message is the browser's, in the browser's language: give `error-message`
 * to write it in the page's language. A message set with
 * `setCustomValidity()` comes first.
 *
 * Its `input` and `change` events are those of a native control, on the
 * host: frameworks bind `value` as they would on an `<input>` (`v-model` in
 * Vue).
 *
 * @csspart label - The native `<label>`.
 * @csspart hint - The hint, between the label and the control. Hidden without `hint`.
 * @csspart error - The error message, after the control. Hidden while no error shows.
 * @fires input - The native `input` event of the inner control, on each change of the value by the user.
 * @fires change - When the user commits a change of the value, as on a native control (the inner `change` doesn't leave the shadow root: the host fires its own).
 * @tokens field - Its tokens (`@cssprop`), shared by every field, from `@unicorne/tokens` (`src/component/field/`): `npm run analyze` documents them.
 */
export abstract class FieldBase extends withInternals(withDisabled(DSBaseElement)) {
  /** Renders the icon of its error message with the `icon` of its own registration (ADR 0001, D2). */
  static override dependencies = [Icon];

  /** Takes part in its form: value, validity, reset, `<fieldset disabled>`. */
  static formAssociated = true;

  static styles = [super.styles ?? [], fieldTokens, fieldBaseStyles];

  static shadowRootOptions: ShadowRootInit = { ...super.shadowRootOptions, delegatesFocus: true };

  static {
    // The error depends on the validity of the native control, known once
    // it has rendered the new value: `updated()` sets it, which renders
    // again. Lit's development build would warn about it (`disableWarning`
    // only exists there).
    this.disableWarning?.("change-in-update");
  }

  /** The visible label, and the accessible name of the control. Required. */
  @property({ type: String })
  label = "";

  /** A help text between the label and the control, read with the control. */
  @property({ type: String })
  hint = "";

  /** Name of the value in the form's data. Reflected: the form reads the attribute. */
  @property({ type: String, reflect: true })
  name = "";

  /**
   * The value, submitted with the form. The `value` attribute is the
   * default value: the form's reset restores it.
   */
  @property({ type: String })
  value = "";

  /** The form can't be submitted while the field is empty. */
  @property({ type: Boolean })
  required = false;

  /** The `autocomplete` of the control: what the browser can fill in (`email`, `name`…). */
  @property({ type: String })
  autocomplete?: string;

  /** The error message, in place of the browser's. Say how to fix the error. */
  @property({ type: String, attribute: "error-message" })
  errorMessage = "";

  /**
   * Read by assistive technologies before the error message, which a
   * decorative icon starts: "Error:" in the page's language, with its
   * punctuation (`Erreur :` in French).
   */
  @property({ type: String, attribute: "error-label" })
  errorLabel = "Error:";

  /** Whether the user has changed the value, or validation has run, since the last reset. */
  @state()
  private interacted = false;

  /** The error message shown, `""` while none. */
  @state()
  private error = "";

  /** The message of `setCustomValidity()`. */
  #customValidity = "";

  constructor() {
    super();
    // Fired on the host by a submission attempt, `checkValidity()` and
    // `reportValidity()` of the field or of its form: show the error.
    this.addEventListener("invalid", () => {
      this.interacted = true;
      this.#showError();
    });
  }

  /** The form of the field, or `null`. */
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

  /** Whether the field is validated with its form: `false` while disabled. */
  get willValidate(): boolean {
    return this.internals!.willValidate;
  }

  /** Whether the value is valid. If not, fires `invalid` and shows the error. */
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
      this.#syncValidity();
    }
  }

  /** @internal */
  formResetCallback(): void {
    this.value = this.getAttribute("value") ?? "";
    this.interacted = false;
    this.error = "";
  }

  /** @internal */
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === "string") {
      this.value = state;
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    this.internals?.setFormValue(this.value);
    this.#syncValidity();
  }

  /**
   * Renders the native control, between the hint and the error message. It
   * has `id="control"` (the label's `for`), `class="control"` (the styles)
   * and its own part. It binds `.value=${live(this.value)}`, `required`,
   * `disabled` (`isDisabled`), `autocomplete`, its constraints,
   * `controlInvalid`, `controlDescribedBy`, `handleInput` and
   * `handleChange`.
   */
  protected abstract renderControl(): unknown;

  /** For `renderControl()`: the `aria-describedby` of the control, the hint and the error shown. */
  protected get controlDescribedBy(): string | typeof nothing {
    return [this.hint && "hint", this.error && "error"].filter(Boolean).join(" ") || nothing;
  }

  /** For `renderControl()`: the `aria-invalid` of the control, `"true"` while an error shows. */
  protected get controlInvalid(): "true" | "false" {
    return this.error ? "true" : "false";
  }

  /** For `renderControl()`: the `input` listener of the control. */
  protected handleInput(event: Event): void {
    this.value = (event.target as FieldControl).value;
    // The control already has the new value: update the error now.
    this.#showError();
  }

  /** For `renderControl()`: the `change` listener of the control. */
  protected handleChange(): void {
    this.interacted = true;
    this.#showError();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** The native control, once rendered. */
  get #control(): FieldControl | null {
    return this.renderRoot.querySelector<FieldControl>("#control");
  }

  /** The message of the control's error, `""` while valid. */
  #messageOf(control: FieldControl): string {
    if (control.validity.valid) {
      return "";
    }
    return control.validity.customError
      ? control.validationMessage
      : this.errorMessage || control.validationMessage;
  }

  /** Gives the host the validity of the control, the browser's constraints and ours. */
  #syncValidity(): void {
    const control = this.#control;
    if (!control) {
      return;
    }
    control.setCustomValidity(this.#customValidity);
    if (control.validity.valid) {
      this.internals?.setValidity({});
    } else {
      // The control is the anchor: a failed submission focuses it.
      this.internals?.setValidity(
        control.validity,
        this.#messageOf(control) || this.errorLabel,
        control,
      );
    }
    this.#showError();
  }

  #showError(): void {
    const control = this.#control;
    this.error = this.interacted && control ? this.#messageOf(control) : "";
  }

  render() {
    const icon = this.tagFor(Icon);
    return html`
      <div class="field${this.error ? " field--invalid" : ""}">
        <label part="label" class="label" for="control">${this.label}</label>
        <div part="hint" class="hint" id="hint" ?hidden=${!this.hint}>${this.hint}</div>
        ${this.renderControl()}
        <div part="error" class="error" id="error" ?hidden=${!this.error}>
          ${
            this.error
              ? html`<${icon} class="error-icon" name="danger"></${icon}>
                  <span
                    ><span class="visually-hidden">${this.errorLabel} </span>${this.error}</span
                  >`
              : nothing
          }
        </div>
      </div>
    `;
  }
}
