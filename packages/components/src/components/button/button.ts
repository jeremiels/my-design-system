import { html } from "lit";
import { property } from "lit/decorators.js";
import { withInternals } from "../../mixins/withInternals.js";
import { withInvoker } from "../../mixins/withInvoker.js";
import { ButtonBase } from "../../bases/button/button-base.js";
import type { ButtonType } from "../../bases/button/button.type.js";

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
 * @element u-button
 * @summary Triggers an action or submits a form.
 */
export class Button extends withInvoker(withInternals(ButtonBase)) {
  static override componentName = "button";

  /**
   * Required for ElementInternals.form to resolve an ancestor <form> — a
   * shadow-rendered <button type="submit"> has no light-DOM form owner
   * otherwise, so type="submit"/"reset" would silently do nothing.
   */
  static formAssociated = true;

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

  constructor() {
    super();
    // A click aimed at the host itself (`click()`): the inner button gets it
    // instead, so the host sees one click, as a native button's would.
    this.addEventListener("click", (event) => {
      if (event.composedPath()[0] !== this) {
        return;
      }
      event.stopImmediatePropagation();
      if (!this.isDisabled) {
        this.renderRoot.querySelector<HTMLButtonElement>(".button")?.click();
      }
    });
  }

  protected override handleClick(e: MouseEvent) {
    super.handleClick(e);
    if (this.isDisabled) {
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
    return html`
      <button
        part="button"
        class="button"
        ?disabled=${this.isDisabled}
        type=${this.type}
        value=${this.value}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}
