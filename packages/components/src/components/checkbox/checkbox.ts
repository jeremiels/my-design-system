import { html } from "lit";
import { property } from "lit/decorators.js";
import { ToggleBase } from "../toggle/toggle-base.js";
import checkboxStyles from "./checkbox.css" with { type: "css" };
import checkboxTokens from "./checkbox.tokens.css" with { type: "css" };

/**
 * A checkbox: a box, its label after it, an optional hint and the error
 * message. The user checks it to agree, or to pick an option among others
 * that don't exclude each other. For an option that applies at once, use
 * `switch`. The native control, the form behavior and the layout are those
 * of `ToggleBase`.
 *
 * `indeterminate` shows a bar instead of the check mark: a checkbox that
 * selects all the others, while some of them are. The user's click clears
 * it, as on a native checkbox.
 *
 * @element u-checkbox
 * @summary A labelled checkbox that takes part in its form.
 * @csspart box - The drawn box, with its check mark or its indeterminate bar.
 * @tokens checkbox - Its box's tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/checkbox/`): `npm run analyze` documents them.
 */
export class Checkbox extends ToggleBase {
  static override componentName = "checkbox";

  static styles = [super.styles ?? [], checkboxTokens, checkboxStyles];

  /** Neither checked nor unchecked: some of the options it stands for are checked. Reflected. */
  @property({ type: Boolean, reflect: true })
  indeterminate = false;

  protected override get controlIndeterminate(): boolean {
    return this.indeterminate;
  }

  protected override handleInput(event: Event): void {
    super.handleInput(event);
    this.indeterminate = false;
  }

  protected renderIndicator() {
    return html`<span part="box" class="box" aria-hidden="true"></span>`;
  }
}
