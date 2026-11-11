import { Button, DSBaseElement } from "my-design-system";
import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import acmeCardStyles from "./acme-card.css" with { type: "css" };

/**
 * An ACME-only component: a card with a heading, content and an optional
 * action. Its action is the `button` of its registration — `AcmeButton`.
 *
 * @element acme-card
 * @summary A card with a heading and an action.
 * @slot - The card content.
 * @csspart card - The card container.
 * @csspart heading - The heading.
 * @csspart action - The action button.
 * @cssprop [--acme-card-padding=var(--u-spacing-lg)] - Internal padding.
 * @cssprop [--acme-card-background-color=var(--u-color-surface-raised)] - Background color.
 * @cssprop [--acme-card-border-radius=var(--u-radius-lg)] - Corner radius.
 * @cssprop [--acme-card-shadow=var(--u-shadow-elevation-md)] - Shadow.
 */
export class AcmeCard extends DSBaseElement {
  static override componentName = "card";
  static override dependencies = [Button];
  static styles = [DSBaseElement.styles ?? [], acmeCardStyles];

  /** Card heading. */
  @property({ type: String })
  heading = "";

  /** Label of the action button; no button when empty. */
  @property({ type: String, attribute: "action-label" })
  actionLabel = "";

  render() {
    const button = this.tagFor(Button);
    return html`
      <article part="card" class="card">
        <h2 part="heading" class="heading">${this.heading}</h2>
        <slot></slot>
        ${this.actionLabel ? html`<${button} part="action">${this.actionLabel}</${button}>` : nothing}
      </article>
    `;
  }
}
