import { html } from "lit/static-html.js";
import { property } from "lit/decorators.js";
import type { PopupToggleReason } from "../../events/popup-toggle.js";
import { PopupBase } from "../../bases/popup/popup-base.js";
import { Button } from "../button/button.js";
import popoverStyles from "./popover.css" with { type: "css" };
import popoverTokens from "./popover.tokens.css" with { type: "css" };

/**
 * A popover: a button that shows a panel of content below it, an
 * explanation, a few fields, a set of links. The panel is a non-modal
 * dialog: the page stays usable, and Tab goes from the button into the
 * content. The popup and its closing are those of `PopupBase` (ADR 0022).
 *
 * The component renders its trigger, an `outlined` and `neutral` `button`
 * with `popup="dialog"`: its control reports `aria-expanded` (ADR 0031).
 * `label` names the trigger and the panel. Escape closes
 * the panel and gives the focus back to the trigger; a press outside and
 * the focus leaving the component close it too.
 *
 * @element u-popover
 * @summary A button that shows a panel of content.
 * @slot - The content of the panel.
 * @csspart trigger - The button that opens the panel: the `button` component of the same registration.
 * @csspart panel - The panel, `role="dialog"`, in the top layer.
 * @tokens popover - Its panel's tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/popover/`): `npm run analyze` documents them.
 */
export class Popover extends PopupBase {
  static override componentName = "popover";

  /** Renders its trigger with the `button` of its own registration. */
  static override dependencies = [Button];

  static styles = [super.styles ?? [], popoverTokens, popoverStyles];

  /** The label of the trigger, and the accessible name of the panel. Required. */
  @property({ type: String })
  label = "";

  protected get popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part~="panel"]') ?? null;
  }

  protected get anchor(): HTMLElement | null {
    return this.#trigger;
  }

  get #trigger(): Button | null {
    return this.renderRoot?.querySelector<Button>('[part~="trigger"]') ?? null;
  }

  protected override popupHidden(reason: PopupToggleReason): void {
    if (reason === "escape-key") {
      this.#trigger?.focus();
    }
  }

  #onTriggerClick = () => {
    if (this.open) {
      this.hidePopup("trigger-press");
    } else {
      this.showPopup("trigger-press");
    }
  };

  render() {
    const button = this.tagFor(Button);
    return html`
      <${button}
        part="trigger"
        class="trigger"
        variant="neutral"
        appearance="outlined"
        popup="dialog"
        .expanded=${this.open}
        ?disabled=${this.isDisabled}
        @click=${this.#onTriggerClick}
      >
        <span class="label">${this.label}</span><span class="chevron" aria-hidden="true"></span>
      </${button}>
      <div
        part="panel"
        class="popup panel"
        id="panel"
        role="dialog"
        aria-label=${this.label}
        popover="manual"
      >
        <slot></slot>
      </div>
    `;
  }
}
