import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import stepperTokens from "../stepper/stepper.tokens.css" with { type: "css" };
import stepStyles from "./step.css" with { type: "css" };
import type { Orientation } from "../../types/common.js";
import type { StepStatus } from "./step.type.js";

/**
 * A step of a `stepper`: a bar, then its label (ADR 0029). Its `stepper`
 * sets its `status` from its own `value`: a step has no use outside a
 * `stepper`.
 *
 * The host has `role="listitem"`, and `aria-current="step"` while it is the
 * current step. A complete step adds `completedLabel` to its label, for
 * assistive technologies: its color alone doesn't say it.
 *
 * @element u-step
 * @summary A step of a stepper.
 * @slot - The label of the step.
 * @csspart bar - The bar: filled once the step is current or complete.
 * @csspart label - The label.
 * @tokens stepper - Its tokens (`@cssprop`), shared with `stepper`, from `@unicorne/tokens` (`src/component/stepper/`): `npm run analyze` documents them.
 */
export class Step extends DSBaseElement {
  static override componentName = "step";

  static styles = [super.styles ?? [], stepperTokens, stepStyles];

  /** The value of its `stepper` while it is the current step. */
  @property({ type: String })
  value = "";

  /** Where the step stands. Set by its `stepper`, from the `value` of the `stepper`. Reflected. */
  @property({ type: String, reflect: true })
  status: StepStatus = "upcoming";

  /** The direction of its `stepper`: set by it. Reflected. */
  @property({ type: String, reflect: true })
  orientation: Orientation = "horizontal";

  /** Read after the label of a complete step, by assistive technologies only. */
  @property({ type: String, attribute: "completed-label" })
  completedLabel = "(completed)";

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "listitem");
    }
  }

  protected override updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (this.status === "current") {
      this.setAttribute("aria-current", "step");
    } else {
      this.removeAttribute("aria-current");
    }
    if (changedProperties.has("value")) {
      // Its stepper computes the status of its steps from their values.
      (this.parentElement as { requestUpdate?: () => void } | null)?.requestUpdate?.();
    }
  }

  /** The same template in every status: a server renders the step before its stepper sets it. */
  render() {
    return html`
      <span part="bar" class="bar"></span>
      <span part="label" class="label"
        ><slot></slot>
        <span class="visually-hidden" ?hidden=${this.status !== "complete"}
          >${this.completedLabel}</span
        ></span
      >
    `;
  }
}
