import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { withAnchoredPopover } from "../../mixins/withAnchoredPopover.js";
import { withExitTransition } from "../../mixins/withExitTransition.js";
import { FieldBase } from "../field/field-base.js";
import comboboxStyles from "./combobox-base.css" with { type: "css" };
import comboboxTokens from "./combobox.tokens.css" with { type: "css" };
import type { ComboboxEntry } from "./combobox.type.js";

/**
 * Shared base of the comboboxes: a form field whose control opens a popup
 * below it, `autocomplete` for instance. Abstract: extend `Autocomplete`, or
 * write a combobox with `renderCombobox()` and `renderPopup()`. The label,
 * the hint, the error and the form behavior are those of `FieldBase`.
 *
 * The control keeps the focus while the popup is open, and names the
 * popup's content with `aria-controls`: both are in the same shadow root
 * (ADR 0009). The popup is a `popover="manual"` in the top layer, anchored
 * by `withAnchoredPopover`, with the entry and exit of `withExitTransition`.
 *
 * Keys of the control, popup closed: ArrowDown and ArrowUp open it and enter
 * it at its first or last item, Alt+ArrowDown opens it without entering.
 * Popup open: Escape and Alt+ArrowUp close it, Tab closes it and moves on;
 * the others go to `handlePopupKeydown()`. The popup also closes when the
 * focus leaves the field, when the field is disabled, and when its form is
 * reset. Escape closes only the popup, not a modal around the field.
 *
 * @csspart popup - The popup, below the control, in the top layer.
 * @tokens combobox - Its tokens (`@cssprop`), shared by every combobox, from `@unicorne/tokens` (`src/component/combobox/`): `npm run analyze` documents them.
 */
export abstract class ComboboxBase extends withAnchoredPopover(withExitTransition(FieldBase)) {
  static styles = [super.styles ?? [], comboboxTokens, comboboxStyles];

  /**
   * Whether the popup is open. Reflected. Follows the real state: it turns
   * `false` when the user closes the popup. Set to `true`, it opens only
   * with some content to show.
   */
  @property({ type: Boolean, reflect: true })
  open = false;

  constructor() {
    super();
    // Retargeted to the host: fired only when the focus leaves the field.
    this.addEventListener("focusout", () => this.hidePopup());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Out of the document, the popover left the top layer: its state follows.
    const popup = this.popup;
    if (popup) {
      this.cancelExitTransition(popup);
      this.closePopover(popup);
    }
    this.open = false;
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.hidePopup();
  }

  /**
   * Renders the control, from `renderCombobox()`, then the popup with the
   * content of `renderPopup()`.
   */
  protected renderControl() {
    return html`
      ${this.renderCombobox()}
      <div part="popup" class="popup" popover="manual">${this.renderPopup()}</div>
    `;
  }

  /**
   * Renders the control: `role="combobox"`, with the contract of
   * `FieldBase.renderControl()` (`id="control"`, `class="control"`). It binds
   * `aria-expanded=${this.comboboxExpanded}`,
   * `aria-controls=${this.comboboxControls}` and
   * `@keydown=${this.handleComboboxKeydown}`.
   */
  protected abstract renderCombobox(): unknown;

  /** Renders the content of the popup, a list of options for instance. */
  protected abstract renderPopup(): unknown;

  /** For `renderCombobox()`: the `aria-expanded` of the control. */
  protected get comboboxExpanded(): "true" | "false" {
    return this.open ? "true" : "false";
  }

  /** For `renderCombobox()`: the `aria-controls` of the control, the `id` of the popup's content. */
  protected get comboboxControls(): string {
    return "listbox";
  }

  /** Whether the popup has something to show: it doesn't open empty. `true` by default. */
  protected get hasPopupContent(): boolean {
    return true;
  }

  /** Opens the popup, if it has content. The keyboard enters it at `entry`, through `enterPopup()`. */
  protected showPopup(entry: ComboboxEntry = "none"): void {
    if (this.isDisabled || !this.hasPopupContent) {
      return;
    }
    this.open = true;
    this.enterPopup(entry);
  }

  /** Closes the popup, after its exit transition. */
  protected hidePopup(): void {
    this.open = false;
  }

  /** Moves the keyboard into the popup, opened from the keyboard. Does nothing by default. */
  protected enterPopup(_entry: ComboboxEntry): void {}

  /**
   * Handles a key of the control while the popup is open, other than
   * Escape, Alt+ArrowUp and Tab. Returns whether it handled it: the base
   * then prevents its default. Handles none by default.
   */
  protected handlePopupKeydown(_event: KeyboardEvent): boolean {
    return false;
  }

  /** For `renderCombobox()`: the `keydown` listener of the control. */
  protected handleComboboxKeydown(event: KeyboardEvent): void {
    // A key of an input method composes the text: leave it alone. Safari
    // resets isComposing before the Enter that confirms the composition,
    // which still has keyCode 229.
    if (this.isDisabled || event.isComposing || event.keyCode === 229) {
      return;
    }
    const { key, altKey } = event;
    if (!this.open) {
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        this.showPopup(altKey ? "none" : key === "ArrowDown" ? "first" : "last");
      }
      return;
    }
    if (key === "Escape" || (key === "ArrowUp" && altKey)) {
      // Not to the page: a modal around the field stays open.
      event.preventDefault();
      event.stopPropagation();
      this.hidePopup();
    } else if (key === "Tab") {
      this.hidePopup();
    } else if (this.handlePopupKeydown(event)) {
      event.preventDefault();
    }
  }

  /** The popup, once rendered. */
  protected get popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>(".popup") ?? null;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (this.open && (this.isDisabled || !this.hasPopupContent)) {
      this.open = false;
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (changedProperties.has("open")) {
      if (this.open) {
        void this.#show();
      } else {
        this.#hide();
      }
    }
  }

  async #show(): Promise<void> {
    const popup = this.popup;
    const control = this.renderRoot.querySelector<HTMLElement>("#control");
    if (!popup || !control) {
      return;
    }
    // Opened again during its exit transition: it never closed.
    this.cancelExitTransition(popup);
    await this.openPopover(popup, control);
  }

  #hide(): void {
    const popup = this.popup;
    if (popup?.hasAttribute("data-open") && !popup.hasAttribute("data-closing")) {
      void this.closeWithTransition(popup, () => this.closePopover(popup));
    }
  }
}
