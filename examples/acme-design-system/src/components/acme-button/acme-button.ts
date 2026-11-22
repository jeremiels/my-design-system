import { Button } from "@unicorne/components";
import acmeButtonStyles from "./acme-button.css" with { type: "css" };
import acmeButtonTokens from "./acme-button.tokens.css" with { type: "css" };

// Overrides the base's `button` (`designSystem()`, `overrides`): every ACME
// component that renders a button renders this one.
/**
 * ACME's look: pill corners and uppercase labels. The buttons of the other
 * components, a modal's or a card's, look the same.
 *
 * @element acme-button
 * @summary Triggers an action or submits a form, with ACME's pill corners.
 * @tokens button - The tokens ACME changes, from tokens/component/button/; the others are the base's.
 */
export class AcmeButton extends Button {
  static styles = [Button.styles ?? [], acmeButtonTokens, acmeButtonStyles];
}
