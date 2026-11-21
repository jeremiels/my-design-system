import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import type { Orientation } from "../../types/common.js";
import { Step } from "../step/step.js";
import stepperStyles from "./stepper.css" with { type: "css" };
import stepperTokens from "./stepper.tokens.css" with { type: "css" };

/**
 * A stepper: where the user stands in a task done in several steps, a form
 * over several pages for instance (ADR 0029). It contains `step` elements,
 * in order; `value` is that of the current step. It shows, and doesn't
 * navigate: the page's own buttons move to the next step.
 *
 * The host is a list (`role="list"`), named by `label`. The steps before the
 * current one are complete, those after it upcoming. Without `value`, the
 * first step is the current one.
 *
 * @element u-stepper
 * @summary The steps of a task, and the current one.
 * @slot - The steps, `step` elements.
 * @tokens stepper - Its tokens (`@cssprop`), shared with `step`, from `@unicorne/tokens` (`src/component/stepper/`): `npm run analyze` documents them.
 */
export class Stepper extends DSBaseElement {
  static override componentName = "stepper";

  static styles = [super.styles ?? [], stepperTokens, stepperStyles];

  /** The accessible name of the list: what the steps are of, "Your request" for instance. */
  @property({ type: String })
  label = "";

  /** The `value` of the current step. */
  @property({ type: String })
  value = "";

  /** The direction of the steps: `horizontal`, or `vertical` for a narrow column. Reflected. */
  @property({ type: String, reflect: true })
  orientation: Orientation = "horizontal";

  #observer?: MutationObserver;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
    }
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** The steps, in order. None on a server: the element has no children there. */
  get #steps(): Step[] {
    return Array.from(this.children ?? []).filter((child): child is Step => child instanceof Step);
  }

  protected override updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (this.label) {
      this.setAttribute("aria-label", this.label);
    } else {
      this.removeAttribute("aria-label");
    }
    const steps = this.#steps;
    const current = Math.max(
      steps.findIndex((step) => step.value === this.value),
      0,
    );
    steps.forEach((step, index) => {
      step.status = index < current ? "complete" : index === current ? "current" : "upcoming";
      step.orientation = this.orientation;
    });
  }

  render() {
    return html`<slot></slot>`;
  }
}
