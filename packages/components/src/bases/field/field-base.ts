import { nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { withFormControl } from "../../mixins/withFormControl.js";
import { withInternals } from "../../mixins/withInternals.js";
import { DSBaseElement } from "../base-element.js";
import { Icon } from "../../components/icon/icon.js";
import fieldBaseStyles from "./field-base.css" with { type: "css" };
import fieldTokens from "./field.tokens.css" with { type: "css" };

/** The native control of a field. */
type FieldControl = HTMLInputElement | HTMLTextAreaElement;

/**
 * The `type` of the native inputs where Enter submits the form (HTML's
 * "fields that block implicit submission").
 */
const SINGLE_LINE_TYPES = new Set([
  "text",
  "search",
  "url",
  "tel",
  "email",
  "password",
  "date",
  "month",
  "week",
  "time",
  "datetime-local",
  "number",
]);

/** A submit button of a form: a native one, or a component with `type="submit"` (`button`). */
function isSubmitButton(element: Element): element is HTMLElement & { disabled?: boolean } {
  const type = (element as { type?: unknown }).type;
  return type === "submit" || (element instanceof HTMLInputElement && type === "image");
}

/**
 * The `id` of the elements `FieldBase` renders in its shadow root, for what
 * refers to them: a list named by the label, a popup anchored to the control.
 */
export const fieldIds = {
  label: "label",
  hint: "hint",
  control: "control",
  error: "error",
} as const;

/**
 * Shared base of the form fields, `text-field` and `textarea`: a label, an
 * optional hint, a native control and its error message. Abstract: extend
 * `TextField` or `Textarea`, or write a field with `renderControl()`. The
 * label stays in the shadow root of its control: an `id` doesn't cross a
 * shadow root (ADR 0007).
 *
 * A field takes part in its form like a native control (`withFormControl`):
 * it submits `value` under `name`, blocks the submission while invalid,
 * follows the form's reset and a `<fieldset disabled>`. A `readonly` field
 * keeps its value and isn't validated.
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
 * In a single-line field, Enter submits the form, as in a native `<input>`:
 * the inner control has no form of its own, so the field does it
 * (`submitOnEnter()`).
 *
 * A required field shows `requiredIndicator` after its label, and the
 * control is announced as required. Where every field of a form is
 * required, set `required-indicator=""` and say it once above the form.
 *
 * Once the error shows, the host matches `:state(user-invalid)`, as a
 * native control matches `:user-invalid`: style the layout around the field
 * with it. An enhancement: browsers without `:state()` (Chrome before 125,
 * Firefox before 126, Safari before 17.4) don't match it, and the field
 * shows its error without it.
 *
 * @csspart label - The native `<label>`.
 * @csspart required-indicator - The indicator after the label, hidden from assistive technologies. Hidden unless the field is `required` and has a `requiredIndicator`.
 * @csspart hint - The hint, between the label and the control. Hidden without `hint`.
 * @csspart error - The error message, after the control. Hidden while no error shows.
 * @cssstate user-invalid - The error shows: the user has changed the value and left the field, or validation has run.
 * @fires input - The native `input` event of the inner control, on each change of the value by the user.
 * @fires change - When the user commits a change of the value, as on a native control (the inner `change` doesn't leave the shadow root: the host fires its own).
 * @tokens field - Its tokens (`@cssprop`), shared by every field, from `@unicorne/tokens` (`src/component/field/`): `npm run analyze` documents them.
 */
export abstract class FieldBase extends withFormControl(
  withInternals(withDisabled(DSBaseElement)),
) {
  /** Renders the icon of its error message with the `icon` of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [Icon];

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

  /**
   * Shown after the label of a required field, and hidden from assistive
   * technologies: they announce the control as required. `""` shows none.
   */
  @property({ type: String, attribute: "required-indicator" })
  requiredIndicator = "*";

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

  constructor() {
    super();
    // Fired on the host by a submission attempt, `checkValidity()` and
    // `reportValidity()` of the field or of its form: show the error.
    this.addEventListener("invalid", () => {
      this.interacted = true;
      this.#showError();
    });
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.interacted = false;
    this.error = "";
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    // Sets the form value, then the validity (`updateValidity()`).
    super.updated(changedProperties);
    // After updateValidity(): it may show the error, which updates again.
    this.customStates.set("user-invalid", this.error !== "");
  }

  /**
   * Renders the native control, between the hint and the error message. It
   * has `id="control"` (the label's `for`), `class="control"` (the styles)
   * and its own part. It binds `.value=${live(this.value)}`, `required`,
   * `readonly` (`readOnly`), `disabled` (`isDisabled`), `autocomplete`, its constraints,
   * `controlInvalid`, `controlDescribedBy`, `handleInput` and
   * `handleChange`. A single-line control also binds
   * `@keydown=${this.submitOnEnter}`.
   */
  protected abstract renderControl(): unknown;

  /** For `renderControl()`: the `aria-describedby` of the control, the hint and the error shown. */
  protected get controlDescribedBy(): string | typeof nothing {
    return (
      [this.hint && fieldIds.hint, this.error && fieldIds.error].filter(Boolean).join(" ") ||
      nothing
    );
  }

  /** For `renderControl()`: the `aria-invalid` of the control, `"true"` while an error shows. */
  protected get controlInvalid(): "true" | "false" {
    return this.error ? "true" : "false";
  }

  /** For `renderControl()`: the `input` listener of the control. */
  protected handleInput(event: Event): void {
    this.value = (event.target as FieldControl).value;
  }

  /** For `renderControl()`: the `change` listener of the control. */
  protected handleChange(): void {
    this.markInteracted();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** The user has changed the value: the error shows from now on, as after `change`. */
  protected markInteracted(): void {
    this.interacted = true;
    this.#showError();
  }

  /**
   * For the `keydown` listener of a single-line control: Enter submits the
   * form, as HTML's implicit submission does for a native `<input>`. With a
   * submit button in the form, the first one is clicked, unless it is
   * disabled: a component submit button submits on `click()`. Without any, it is submitted when this field is its only
   * single-line one. Does nothing for a key another listener has handled,
   * nor while an input method composes the text.
   */
  protected submitOnEnter(event: KeyboardEvent): void {
    const form = this.form;
    if (
      event.key !== "Enter" ||
      event.defaultPrevented ||
      event.isComposing ||
      event.keyCode === 229 ||
      !form
    ) {
      return;
    }
    const controls = Array.from(form.elements);
    const submitter = controls.find(isSubmitButton);
    if (submitter) {
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        if (!submitter.disabled) {
          form.requestSubmit(submitter);
        }
      } else {
        // A component: its click() submits with its name and value, unless
        // it is disabled (`button`).
        submitter.click();
      }
      return;
    }
    const singleLine = controls.filter(
      (control) =>
        (control instanceof HTMLInputElement && SINGLE_LINE_TYPES.has(control.type)) ||
        (control instanceof FieldBase &&
          control.#control instanceof HTMLInputElement &&
          SINGLE_LINE_TYPES.has(control.#control.type)),
    );
    if (singleLine.length === 1) {
      form.requestSubmit();
    }
  }

  /** The native control, once rendered. */
  get #control(): FieldControl | null {
    return this.renderRoot.querySelector<FieldControl>(`#${fieldIds.control}`);
  }

  /** The message of the control's error, `""` while valid or read-only. */
  #messageOf(control: FieldControl): string {
    if (control.validity.valid || this.readOnly) {
      return "";
    }
    return control.validity.customError
      ? control.validationMessage
      : this.errorMessage || control.validationMessage;
  }

  /** Gives the host its validity, with `syncValidity()`, then shows its error. */
  protected override updateValidity(): void {
    this.syncValidity();
    this.#showError();
  }

  /**
   * Gives the host the validity of its value: by default, that of the native
   * control, the browser's constraints and ours. A field without a native
   * control overrides it (`ChoiceGroupBase`).
   */
  protected syncValidity(): void {
    const control = this.#control;
    if (!control) {
      return;
    }
    control.setCustomValidity(this.customValidity);
    // A read-only control keeps the flags of its constraints, but the
    // browser doesn't validate it.
    if (control.validity.valid || this.readOnly) {
      this.internals?.setValidity({});
    } else {
      // The control is the anchor: a failed submission focuses it.
      this.internals?.setValidity(
        control.validity,
        this.#messageOf(control) || this.errorLabel,
        control,
      );
    }
  }

  /**
   * For `syncValidity()` of a field without a native control: the value is
   * missing (`required` and empty), invalid with the message of
   * `setCustomValidity()`, or valid. A read-only field is valid. The message
   * of a missing value is `errorMessage`, or else that of the hidden native
   * control the field renders with `class="validity-proxy"` and `required`:
   * the browser's, in its language. `anchor` gets the focus on a failed
   * submission.
   */
  protected syncValueValidity(missing: boolean, anchor?: HTMLElement): void {
    const internals = this.internals;
    if (!internals) {
      return;
    }
    if (this.readOnly) {
      internals.setValidity({});
    } else if (this.customValidity) {
      internals.setValidity({ customError: true }, this.customValidity, anchor);
    } else if (missing) {
      const proxy = this.renderRoot.querySelector<HTMLInputElement | HTMLSelectElement>(
        ".validity-proxy",
      );
      const message = this.errorMessage || proxy?.validationMessage || this.errorLabel;
      internals.setValidity({ valueMissing: true }, message, anchor);
    } else {
      internals.setValidity({});
    }
  }

  /** Shows the message of the host's validity, once the user has interacted. */
  #showError(): void {
    this.error =
      this.interacted && this.internals && !this.internals.validity.valid
        ? this.internals.validationMessage
        : "";
  }

  /** Whether an error shows: for the layout of `render()`, and `aria-invalid`. */
  protected get hasError(): boolean {
    return this.error !== "";
  }

  /**
   * Renders the field: the label, the hint, the control, the error. A field
   * with another layout overrides it, and calls `renderLabel()`,
   * `renderHint()`, `renderControl()` and `renderError()`.
   */
  render() {
    return html`
      <div class="field${this.error ? " field--invalid" : ""}">
        ${this.renderLabel()} ${this.renderHint()} ${this.renderControl()} ${this.renderError()}
      </div>
    `;
  }

  /** The label's text and the indicator of a required field. */
  protected renderLabelContent() {
    return html`${this.label}<span
        part="required-indicator"
        class="required-indicator"
        aria-hidden="true"
        ?hidden=${!this.required || !this.requiredIndicator}
        >${this.requiredIndicator}</span
      >`;
  }

  /** The `<label>` of the control: `id="label"`, `for="control"`. */
  protected renderLabel() {
    return html`<label part="label" class="label" id=${fieldIds.label} for=${fieldIds.control}
      >${this.renderLabelContent()}</label
    >`;
  }

  /** The hint: `id="hint"`, hidden without `hint`. */
  protected renderHint() {
    return html`<div part="hint" class="hint" id=${fieldIds.hint} ?hidden=${!this.hint}>
      ${this.hint}
    </div>`;
  }

  /** The error message: `id="error"`, hidden while no error shows. */
  protected renderError() {
    const icon = this.tagFor(Icon);
    return html`<div part="error" class="error" id=${fieldIds.error} ?hidden=${!this.error}>
      ${
        this.error
          ? html`<${icon} class="error-icon" name="danger"></${icon}>
              <span><span class="visually-hidden">${this.errorLabel} </span>${this.error}</span>`
          : nothing
      }
    </div>`;
  }
}
