import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import badgeStyles from "./badge.css" with { type: "css" };
import badgeTokens from "./badge.tokens.css" with { type: "css" };
import type { BadgeVariant } from "./badge.type.js";

/**
 * A badge: a short status next to what it qualifies, "Sent" or "Draft" for
 * instance (ADR 0027). It is text, without a role nor any interaction: its
 * text says the status, its colors repeat it. A status that changes while
 * the user looks is announced by a live region, not by the badge.
 *
 * Several badges in a row form a list: put them in a `<ul>`.
 *
 * @element u-badge
 * @summary A short status, as colored text.
 * @slot - The text of the badge.
 * @csspart badge - The badge.
 * @tokens badge - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/badge/`): `npm run analyze` documents them.
 */
export class Badge extends DSBaseElement {
  static override componentName = "badge";

  static styles = [super.styles ?? [], badgeTokens, badgeStyles];

  /** The intent of the status: sets its colors. Its text must say it too. */
  @property({ type: String, reflect: true })
  variant: BadgeVariant = "information";

  render() {
    return html`<span part="badge" class="badge"><slot></slot></span>`;
  }
}
