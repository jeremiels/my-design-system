import { Button } from "my-design-system";
import acmeButtonStyles from "./acme-button.css" with { type: "css" };
import acmeButtonTokens from "./acme-button.tokens.css" with { type: "css" };

/**
 * ACME's button: the base button with pill corners and uppercase labels.
 * Registered as the `button` override, so every ACME component that renders
 * a button (modal, card…) renders this one.
 *
 * @element acme-button
 * @summary The base button, ACME style.
 * @tokens button - The tokens ACME changes, from tokens/component/button/; the others are the base's.
 */
export class AcmeButton extends Button {
  static styles = [Button.styles ?? [], acmeButtonTokens, acmeButtonStyles];
}
