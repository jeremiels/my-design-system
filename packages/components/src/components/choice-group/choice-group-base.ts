import { html, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { Orientation } from "../../types/common.js";
import { FieldBase, fieldIds } from "../field/field-base.js";
import choiceGroupStyles from "./choice-group-base.css" with { type: "css" };
import choiceGroupTokens from "./choice-group.tokens.css" with { type: "css" };

/**
 * Shared base of the groups of choices, `radio-group`: a label, an optional
 * hint, the choices (the children of the host) and the error message.
 * Abstract: extend `RadioGroup`, or write a group with `items` and
 * `groupRole`. The label, the hint, the error and the form behavior are
 * those of `FieldBase` (ADR 0017).
 *
 * The group is the form control: it submits `value` under `name`, and its
 * choices have no form behavior of their own. A `required` group can't be
 * submitted while `value` is empty. Its message is the browser's, from a
 * hidden native radio: give `error-message` to write it in the page's
 * language.
 *
 * The label is the accessible name of the element of the group's role, in
 * the same shadow root.
 *
 * @slot - The choices.
 * @csspart group - The element of the group's role, around the label, the hint, the choices and the error.
 * @csspart choices - The wrapper of the choices.
 * @tokens choice-group - Its tokens (`@cssprop`), shared by the groups of choices, from `@unicorne/tokens` (`src/component/choice-group/`): `npm run analyze` documents them.
 */
export abstract class ChoiceGroupBase extends FieldBase {
  static styles = [super.styles ?? [], choiceGroupTokens, choiceGroupStyles];

  // The choices are children of the host: `focus()` reaches one of them.
  static shadowRootOptions: ShadowRootInit = { ...super.shadowRootOptions, delegatesFocus: false };

  /** The direction of the choices: one below the other, or side by side. Reflected. */
  @property({ type: String, reflect: true })
  orientation: Orientation = "vertical";

  /** The choices, in order. */
  protected abstract get items(): readonly HTMLElement[];

  /** The ARIA role of the group: `radiogroup`, `group`. */
  protected abstract get groupRole(): string;

  /** The choice that gets the focus: from `focus()`, the label, a failed validation. */
  protected get focusTarget(): HTMLElement | undefined {
    return this.items.find((item) => item.tabIndex === 0) ?? this.items[0];
  }

  /** Focuses the choice Tab reaches. */
  override focus(options?: FocusOptions): void {
    this.focusTarget?.focus(options);
  }

  /** The validity of `value`: `required`, and the message of `setCustomValidity()`. */
  protected override syncValidity(): void {
    this.syncValueValidity(this.required && this.value === "", this.focusTarget);
  }

  /** For `render()`: the choices. */
  protected renderControl() {
    return html`<div part="choices" class="choices">
      <slot @slotchange=${this.handleSlotChange}></slot>
    </div>`;
  }

  /** The other choices: their tabindex, their state. */
  protected handleSlotChange(): void {
    this.requestUpdate();
  }

  override render() {
    const radiogroup = this.groupRole === "radiogroup";
    return html`
      <div
        part="group"
        class="group${this.hasError ? " group--invalid" : ""}"
        role=${this.groupRole}
        aria-labelledby=${fieldIds.label}
        aria-describedby=${this.controlDescribedBy}
        aria-invalid=${this.controlInvalid}
        aria-required=${radiogroup && this.required ? "true" : nothing}
        aria-readonly=${radiogroup && this.readOnly ? "true" : nothing}
      >
        <div part="label" class="label" id=${fieldIds.label} @click=${() => this.focus()}>
          ${this.renderLabelContent()}
        </div>
        ${this.renderHint()} ${this.renderControl()} ${this.renderError()}
        <!-- The browser's message of a choice left empty, in its language. -->
        <input class="validity-proxy" type="radio" name="proxy" required hidden tabindex="-1" />
      </div>
    `;
  }
}
