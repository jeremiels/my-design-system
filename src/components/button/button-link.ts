import { html } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { ButtonBase } from "./button-base.js";
import buttonLinkStyles from "./button-link.css" with { type: "css" };

type LinkTarget = "_blank" | "_self" | "_parent" | "_top";

/**
 * A link that looks like a button, for navigation. When disabled it drops its
 * `href`, so it leaves the tab order and can't navigate.
 *
 * @element my-button-link
 * @summary A link styled as a button.
 */
export class ButtonLink extends ButtonBase {
  static override componentName = "button-link";

  /** URL the link points to. */
  @property({ type: String })
  href?: string;

  /** Where to open the link; `_blank` also sets `rel="noopener noreferrer"`. */
  @property({ type: String })
  target?: LinkTarget = "_self";

  /**
   * Compute rel attribute based on target
   * Add security-related attributes when target="_blank"
   */
  private get relAttribute(): string | undefined {
    return this.target === "_blank" ? "noopener noreferrer" : undefined;
  }

  static styles = [ButtonBase.styles, buttonLinkStyles];

  render() {
    // A disabled <a> has no native equivalent to <button disabled>: dropping
    // href is what removes it from the tab order and stops navigation, per
    // https://www.w3.org/WAI/ARIA/apg/practices/disabled-controls/.
    return html`
      <a
        part="button"
        class="button button--${this.size} button--${this.variant}"
        href=${ifDefined(this.disabled ? undefined : (this.href ?? "#"))}
        target=${ifDefined(this.target)}
        rel=${ifDefined(this.relAttribute)}
        role="button"
        aria-disabled=${ifDefined(this.disabled ? "true" : undefined)}
        @click=${this.handleClick}
        ><slot></slot
      ></a>
    `;
  }
}
