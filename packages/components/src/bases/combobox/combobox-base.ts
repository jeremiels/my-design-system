import { html, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import {
  AnchoredPopoverController,
  anchoredPopoverStyles,
} from "../../controllers/anchored-popover.js";
import { AnnounceController, announceStyles } from "../../controllers/announce.js";
import { DismissController } from "../../controllers/dismiss.js";
import {
  cancelExitTransition,
  closeWithTransition,
  isClosing,
} from "../../controllers/exit-transition.js";
import {
  closedCombobox,
  comboboxReducer,
  type ComboboxContext,
  type ComboboxEntry,
  type ComboboxEvent,
  type ComboboxState,
} from "../../state/combobox.js";
import type { CollectionItem } from "../../state/collection.js";
import { FieldBase, fieldIds } from "../field/field-base.js";
import comboboxStyles from "./combobox-base.css" with { type: "css" };
import comboboxTokens from "./combobox.tokens.css" with { type: "css" };

/**
 * Shared base of the comboboxes: a form field whose control opens a popup
 * below it, `autocomplete` for instance. Abstract: extend `Autocomplete`, or
 * write a combobox with `renderCombobox()` and `renderPopup()`. The label,
 * the hint, the error and the form behavior are those of `FieldBase`.
 *
 * Its state is that of `comboboxReducer()` (`state/combobox.ts`, ADR 0010):
 * whether the popup is open, which of its items is active, whether it follows
 * what the user types. The base sends it the events of the control, and
 * shows the popup it describes.
 *
 * The control keeps the focus while the popup is open, and names the
 * popup's content with `aria-controls`: both are in the same shadow root
 * (ADR 0009). The popup is a `popover="manual"` in the top layer, anchored
 * by an `AnchoredPopoverController`, with an animated entry and exit.
 *
 * Keys of the control, popup closed: ArrowDown and ArrowUp open it and enter
 * it at its first or last item, Alt+ArrowDown opens it without entering.
 * Popup open: Escape and Alt+ArrowUp close it, Tab closes it and moves on;
 * the others, but Escape, go to `handlePopupKeydown()`. The popup also closes when the
 * focus leaves the field, when the field is disabled or read-only, and when
 * its form is reset. Escape closes only the popup, not a modal around the field.
 *
 * A polite live region (`AnnounceController`) announces each new
 * `popupStatus`, the number of suggestions for instance: the popup's content
 * changes without the focus moving.
 *
 * @csspart popup - The popup, below the control, in the top layer.
 * @tokens combobox - Its tokens (`@cssprop`), shared by every combobox, from `@unicorne/tokens` (`src/component/combobox/`): `npm run analyze` documents them.
 */
export abstract class ComboboxBase extends FieldBase {
  static styles = [
    super.styles ?? [],
    anchoredPopoverStyles,
    announceStyles,
    comboboxTokens,
    comboboxStyles,
  ];

  #state: ComboboxState = closedCombobox;

  #popover = new AnchoredPopoverController(this);

  #announcer = new AnnounceController(this);

  constructor() {
    super();
    // Escape and the focus leaving the field close the popup. The focus
    // leaving also ends the typing, popup closed for want of content.
    new DismissController(this, {
      active: (reason) => this.open || (reason === "focus-out" && this.comboboxState.typed),
      dismiss: () => this.hidePopup(),
      escapeKey: true,
      focusOut: true,
    });
  }

  /**
   * Whether the popup is open. Reflected. Follows the real state: it turns
   * `false` when the user closes the popup. Set to `true`, it opens only
   * with some content to show.
   */
  @property({ type: Boolean, reflect: true })
  get open(): boolean {
    return this.#state.open;
  }
  set open(open: boolean) {
    this.dispatch({ type: "request", open });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Out of the document, the popover left the top layer: its state follows.
    const popup = this.popup;
    if (popup) {
      cancelExitTransition(popup);
    }
    this.hidePopup();
  }

  /** @internal */
  override formResetCallback(): void {
    super.formResetCallback();
    this.hidePopup();
  }

  /**
   * Renders the control, from `renderCombobox()`, then the popup with the
   * content of `renderPopup()`, then the live region of `popupStatus`.
   */
  protected renderControl() {
    return html`
      ${this.renderCombobox()}
      <div part="popup" class="popup" popover="manual">${this.renderPopup()}</div>
      ${this.#announcer.render()}
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

  /** For `renderCombobox()`: the `aria-controls` of the control, the `id` of the popup's content. */
  protected abstract get comboboxControls(): string;

  /** For `renderCombobox()`: the `aria-expanded` of the control. */
  protected get comboboxExpanded(): "true" | "false" {
    return this.open ? "true" : "false";
  }

  /** Whether the popup has something to show: it doesn't open empty. `true` by default. */
  protected get hasPopupContent(): boolean {
    return true;
  }

  /** The items of the popup the keyboard moves through, in order. None by default. */
  protected get popupItems(): readonly CollectionItem[] {
    return [];
  }

  /**
   * What the live region announces: a change of the popup's content that
   * the user can't see coming, the number of suggestions for instance.
   * Nothing by default.
   */
  protected get popupStatus(): string {
    return "";
  }

  /** The state of the combobox: `open`, `activeIndex`, `typed`. Change it with `dispatch()`. */
  protected get comboboxState(): ComboboxState {
    return this.#state;
  }

  /** Sends an event to `comboboxReducer()`, and renders again when the state changes. */
  protected dispatch(event: ComboboxEvent): void {
    const previous = this.#state;
    const next = comboboxReducer(previous, event, this.#context);
    if (next !== previous) {
      this.#state = next;
      this.requestUpdate("open", previous.open);
      this.requestUpdate();
    }
  }

  /** Opens the popup, if it has content. The keyboard enters it at `entry`. */
  protected showPopup(entry: ComboboxEntry = "none"): void {
    this.dispatch({ type: "open", entry });
  }

  /** Closes the popup, after its exit transition. */
  protected hidePopup(): void {
    this.dispatch({ type: "close" });
  }

  /**
   * Handles a key of the control while the popup is open, other than
   * Alt+ArrowUp and Tab. Escape reaches it, then closes the popup. Returns whether it handled it: the base
   * then prevents its default. Handles none by default.
   */
  protected handlePopupKeydown(_event: KeyboardEvent): boolean {
    return false;
  }

  /**
   * For `renderCombobox()`: the `keydown` listener of the control. A key
   * neither the popup nor the base handles is the field's: Enter submits the
   * form (`submitOnEnter()`).
   */
  protected handleComboboxKeydown(event: KeyboardEvent): void {
    this.#handlePopupKeys(event);
    this.submitOnEnter(event);
  }

  #handlePopupKeys(event: KeyboardEvent): void {
    // A key of an input method composes the text: leave it alone. Safari
    // resets isComposing before the Enter that confirms the composition,
    // which still has keyCode 229.
    if (this.isDisabled || this.readOnly || event.isComposing || event.keyCode === 229) {
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
    // Escape is the DismissController's, on the host.
    if (key === "ArrowUp" && altKey) {
      event.preventDefault();
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
    // The content, the text or `disabled` may have changed.
    this.dispatch({ type: "sync" });
    const status = this.popupStatus;
    if (status !== this.#announcer.message) {
      this.#announcer.announce(status);
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

  get #control(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>(`#${fieldIds.control}`) ?? null;
  }

  get #context(): ComboboxContext {
    const control = this.#control;
    return {
      disabled: this.isDisabled || this.readOnly,
      hasContent: this.hasPopupContent,
      items: this.popupItems,
      hasText: this.value !== "",
      focused: control !== null && this.shadowRoot?.activeElement === control,
    };
  }

  async #show(): Promise<void> {
    const popup = this.popup;
    const control = this.#control;
    if (!popup || !control) {
      return;
    }
    // Opened again during its exit transition: it never closed.
    cancelExitTransition(popup);
    await this.#popover.open(popup, control);
  }

  #hide(): void {
    const popup = this.popup;
    if (popup && this.#popover.isOpen(popup) && !isClosing(popup)) {
      void closeWithTransition(popup, () => this.#popover.close(popup));
    }
  }
}
