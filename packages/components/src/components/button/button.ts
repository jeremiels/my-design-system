import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { html } from "lit/static-html.js";
import { withInternals } from "../../mixins/withInternals.js";
import { withInvoker } from "../../mixins/withInvoker.js";
import { ButtonBase } from "../../bases/button/button-base.js";
import type { ButtonPopup, ButtonType } from "../../bases/button/button.type.js";
import { Spinner } from "../spinner/spinner.js";

/**
 * A button that triggers an action, or submits or resets its form (`type`).
 * With `commandfor` and `command`, it controls another element without
 * script, like a native invoker button: it opens a `modal` with
 * `command="--show-modal"`.
 *
 * A submit button sends its `name` and `value` with the form data, as a
 * native one does. The `submitter` of the `submit` event is a hidden native
 * `<button>` that carries them, removed once the event has run: a button of
 * a shadow root can't be the submitter of its host's form.
 *
 * `click()` acts as a click on the inner button: it submits, resets or
 * sends the command. Implicit submission relies on it: Enter in a field
 * clicks the form's first submit button (`FieldBase.submitOnEnter()`).
 *
 * With `loading`, a `spinner` covers the label and the button ignores
 * clicks, but keeps the focus: announce the end of the action in a live
 * region. With `popup`, it is the trigger of a menu or a dialog, and
 * `expanded` says whether that popup is open.
 *
 * @element u-button
 * @summary Triggers an action or submits a form.
 * @csspart spinner - The `spinner` over the label, with `loading`.
 */
export class Button extends withInvoker(withInternals(ButtonBase)) {
  static override componentName = "button";

  /**
   * Required for ElementInternals.form to resolve an ancestor <form> — a
   * shadow-rendered <button type="submit"> has no light-DOM form owner
   * otherwise, so type="submit"/"reset" would silently do nothing.
   */
  static formAssociated = true;

  static override dependencies = [Spinner];

  /**
   * Button type.
   * @property {string} type - The type of the button.
   * @default "button"
   */
  @property({ type: String })
  type: ButtonType = "button";

  /**
   * Name of `value` in the form's data, when this button submits the form.
   * Tells the server which button submitted it.
   */
  @property({ type: String })
  name = "";

  /**
   * Value of the button, submitted under `name`. A `modal` closed by this button (`--close`,
   * `--request-close`) takes it as its `returnValue`.
   */
  @property({ type: String })
  value = "";

  /** Whether the action of the button is running: a spinner covers the label, and clicks do nothing. */
  @property({ type: Boolean, reflect: true })
  loading = false;

  /** The popup the button opens, `menu` or `dialog` for instance: `aria-haspopup`. None by default. */
  @property({ type: String })
  popup?: ButtonPopup;

  /** Whether the popup of `popup` is open: `aria-expanded`. */
  @property({ type: Boolean })
  expanded = false;

  constructor() {
    super();
    // A click aimed at the host itself (`click()`): the inner button gets it
    // instead, so the host sees one click, as a native button's would.
    this.addEventListener("click", (event) => {
      if (event.composedPath()[0] !== this) {
        return;
      }
      event.stopImmediatePropagation();
      if (!this.isDisabled && !this.loading) {
        this.renderRoot.querySelector<HTMLButtonElement>(".button")?.click();
      }
    });
  }

  protected override handleClick(e: MouseEvent) {
    super.handleClick(e);
    if (this.isDisabled) {
      return;
    }
    if (this.loading) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const form = this.internals?.form;
    if (this.type === "submit" && form) {
      this.#submit(form);
    } else if (this.type === "reset") {
      form?.reset();
    }
  }

  /**
   * Submits `form` with a hidden native button as its submitter: the form's
   * validation, `submit` event and data are those of a native submit button
   * named `name`.
   */
  #submit(form: HTMLFormElement) {
    const submitter = document.createElement("button");
    submitter.type = "submit";
    submitter.hidden = true;
    if (this.name) {
      submitter.name = this.name;
      submitter.value = this.value;
    }
    form.append(submitter);
    try {
      form.requestSubmit(submitter);
    } finally {
      submitter.remove();
    }
  }

  render() {
    const spinner = this.tagFor(Spinner);
    return html`
      <button
        part="button"
        class=${this.controlClasses}
        ?disabled=${this.isDisabled}
        type=${this.type}
        value=${this.value}
        tabindex=${ifDefined(this.controlTabIndex)}
        aria-label=${this.label || nothing}
        aria-current=${ifDefined(this.current)}
        aria-haspopup=${ifDefined(this.popup)}
        aria-expanded=${this.popup ? String(this.expanded) : nothing}
        aria-disabled=${this.loading && !this.isDisabled ? "true" : nothing}
        @click=${this.handleClick}
      >
        <span class="content"><slot></slot></span>${
          this.loading
            ? html`<${spinner}
                part="spinner"
                class="spinner"
                size="small"
                aria-hidden="true"
              ></${spinner}>`
            : nothing
        }
      </button>
    `;
  }
}
