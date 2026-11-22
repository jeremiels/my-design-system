import { Button, DSBaseElement } from "@unicorne/components";
import { nothing } from "lit";
import { property } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import acmeCardStyles from "./acme-card.css" with { type: "css" };
import acmeCardTokens from "./acme-card.tokens.css" with { type: "css" };

/**
 * A card: a heading, its content, and an optional action, an
 * `acme-button`. It sums up an item of a list, or links to a page.
 *
 * @element acme-card
 * @summary A card with a heading and an action.
 * @slot - The card content.
 * @csspart card - The card container.
 * @csspart heading - The heading.
 * @csspart action - The action button.
 * @tokens card - Its tokens, from tokens/component/card/: `--acme-card-*`.
 */
export class AcmeCard extends DSBaseElement {
  static override componentName = "card";
  static override dependencies = [Button];
  static styles = [DSBaseElement.styles ?? [], acmeCardTokens, acmeCardStyles];

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
