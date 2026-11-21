import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../base-element.js";
import radioStyles from "./radio.css" with { type: "css" };
import radioTokens from "./radio.tokens.css" with { type: "css" };

/**
 * A radio: one choice of a `radio-group`, a circle and its label. Its group
 * checks it, from the group's `value`, and gives it the focus: a radio has
 * no form behavior of its own, and has no use outside a group (ADR 0017).
 *
 * The host has `role="radio"` and `aria-checked`: its label, in its shadow
 * root, is its accessible name.
 *
 * @element u-radio
 * @summary A choice of a radio group.
 * @csspart control - The drawn circle, with its dot when checked.
 * @csspart label - The label.
 * @tokens radio - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/radio/`): `npm run analyze` documents them.
 */
export class Radio extends withDisabled(DSBaseElement) {
  static override componentName = "radio";

  static styles = [super.styles ?? [], radioTokens, radioStyles];

  /** The value of the group while this radio is checked. */
  @property({ type: String })
  value = "";

  /** The visible label, and the accessible name of the radio. Required. */
  @property({ type: String })
  label = "";

  /** Whether the radio is checked. Set by its group, from the group's `value`. Reflected. */
  @property({ type: Boolean, reflect: true })
  checked = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "radio");
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    this.setAttribute("aria-checked", this.checked ? "true" : "false");
    if (changedProperties.has("disabled") || changedProperties.has("value")) {
      // The group computes its tabindex and its value from its radios.
      (this.parentElement as { requestUpdate?: () => void } | null)?.requestUpdate?.();
    }
  }

  render() {
    return html`<span part="control" class="control" aria-hidden="true"></span
      ><span part="label" class="label">${this.label}</span>`;
  }
}
