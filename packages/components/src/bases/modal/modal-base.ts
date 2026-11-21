import type { LitElement, PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { html } from "lit/static-html.js";
import { ModalCancelEvent } from "../../events/modal-cancel.js";
import { ModalCloseEvent } from "../../events/modal-close.js";
import { CommandsController } from "../../controllers/commands.js";
import {
  cancelExitTransition,
  closeWithTransition,
  isClosing,
} from "../../controllers/exit-transition.js";
import { DSBaseElement } from "../base-element.js";
import { Button } from "../../components/button/button.js";
import { Icon } from "../../components/icon/icon.js";
import type { ModalCancelReason, ModalClosedBy } from "./modal.type.js";

/**
 * Shared base of the modal dialogs, `modal` and `drawer`. Built on the
 * native `<dialog>`: the browser provides the backdrop, makes the rest of
 * the page inert, closes it on Escape and gives the focus back to the
 * element that had it. Abstract: extend `Modal` or `Drawer`, with their
 * sheets (ADR 0008, ADR 0022).
 *
 * Open it from a button, without script: `<u-button commandfor="id"
 * command="--show-modal">`, or a native `<button>` with the same attributes.
 * The commands are `--show-modal`, `--close` and `--request-close`; the last
 * two take the button's `value` as `returnValue`. From script, call
 * `showModal()`, `close()` or `requestClose()`, or set `open`.
 *
 * @slot - The dialog content. Its first `autofocus` element gets the focus on opening; the close button otherwise.
 * @csspart dialog - The native `<dialog>`.
 * @csspart content - The content wrapper inside the dialog: the title, the content, and the close button at its top end.
 * @csspart heading - The title, an `<h2>` that shows `label` and names the dialog.
 * @csspart close-button - The button that closes the dialog: the `button` component of the same registration.
 * @csspart close-icon - The icon of the close button: the `icon` component of the same registration. `close-label` names the button.
 * @fires {ModalCancelEvent} u-cancel - Before it closes at the user's request: close button, Escape, click outside, `requestClose()`. Its `reason` says which. Cancelable: `preventDefault()` keeps it open.
 * @fires {ModalCloseEvent} u-close - When the dialog closes, whatever the cause. Its `value` is the modal's `returnValue`.
 */
export abstract class ModalBase extends DSBaseElement {
  /**
   * Renders its close button and its icon with the `button` and the `icon`
   * of its own registration (ADR 0001, D2).
   */
  static override dependencies = [Button, Icon];

  /**
   * Whether the modal is open. Reflects to the `open` attribute, so it can
   * be set declaratively (`<u-modal open>`) or bound reactively
   * (`?open=${state}`). Follows the real state: it turns `false` when the
   * user closes the modal.
   */
  @property({ type: Boolean, reflect: true }) open = false;

  /**
   * The title of the dialog: a heading at its top, which names it, announced
   * when it opens (ADR 0033). Required: a dialog without a name is
   * announced as just "dialog".
   */
  @property({ type: String })
  label?: string;

  /**
   * Hides the title on screen; it still names the dialog. For a content
   * that shows its own title. Reflected.
   */
  @property({ type: Boolean, reflect: true, attribute: "label-hidden" })
  labelHidden = false;

  /**
   * Accessible name of the close button, which shows only an icon. Translate
   * it with the page: `close-label="Fermer"`.
   */
  @property({ type: String, attribute: "close-label" })
  closeLabel = "Close";

  /**
   * What closes the modal besides its close button, commands and methods:
   * `closerequest`, Escape and the back gesture; `any`, also a click outside;
   * `none`, nothing else.
   */
  @property({ type: String, attribute: "closedby" })
  closedBy: ModalClosedBy = "closerequest";

  /**
   * The value the modal closed with: the `value` of the button that sent
   * `--close` or `--request-close`, or the argument of `close()` or
   * `requestClose()`. Empty on opening, and when dismissed without a value.
   */
  returnValue = "";

  /** @internal */
  @query("dialog") dialog!: HTMLDialogElement;

  /** The last press on the dialog started outside it: on the backdrop. */
  private pressedOutside = false;

  /** Escape is down: the browser's `cancel` that follows, in the same task, is its. */
  private escapeKey = false;

  constructor() {
    super();
    new CommandsController(this, (event) => this.handleCommand(event));
  }

  connectedCallback() {
    super.connectedCallback();
    // Moved in the DOM while open (a portal, a reordered list…): removing
    // the dialog took it out of the top layer but left it open, as a
    // non-modal dialog — no backdrop, the page isn't inert, Escape doesn't
    // close it. Reopen it as a modal; its `close` event isn't a closing.
    if (this.hasUpdated && this.dialog.open && !this.dialog.matches(":modal")) {
      this.dialog.close();
      this.dialog.showModal();
    }
  }

  /**
   * Opens the modal, like `open = true` and the `--show-modal` command. The
   * dialog is open on return once the modal has rendered, on its first
   * render otherwise.
   */
  showModal(): void {
    this.open = true;
    if (this.hasUpdated) {
      this.showDialog();
    }
  }

  /**
   * Closes the modal, like `open = false` and the `--close` command, without
   * `u-cancel`. Its exit transition runs first; `u-close` follows.
   * @param returnValue - The value it closes with, in `returnValue` and `u-close`.
   */
  close(returnValue?: string): void {
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.open = false;
    if (this.hasUpdated) {
      this.closeDialog();
    }
  }

  /**
   * Asks to close the modal, like its close button and the `--request-close`
   * command: fires `u-cancel`, then closes unless a listener canceled it.
   * @param returnValue - The value it closes with, in `returnValue` and `u-close`.
   */
  requestClose(returnValue?: string): void {
    this.requestCloseFor("imperative", returnValue);
  }

  render() {
    const button = this.tagFor(Button);
    const icon = this.tagFor(Icon);
    return html`
      <dialog
        part="dialog"
        aria-labelledby=${ifDefined(this.label ? "heading" : undefined)}
        closedby=${this.closedBy === "any" ? "closerequest" : this.closedBy}
        @keydown=${this.handleDialogKeydown}
        @cancel=${this.handleDialogCancel}
        @close=${this.handleDialogClose}
        @pointerdown=${this.handlePointerDown}
        @pointerup=${this.handlePointerUp}
      >
        <div part="content" class="content">
          <!-- First in the focus order, at the top end on screen. -->
          <${button}
            part="close-button"
            class="close"
            variant="neutral"
            appearance="plain"
            label=${this.closeLabel}
            @click=${this.handleCloseButton}
          >
            <${icon} part="close-icon" name="close"></${icon}>
          </${button}>
          <h2 part="heading" class="heading" id="heading" ?hidden=${!this.label}>${this.label}</h2>
          <div class="body"><slot></slot></div>
        </div>
      </dialog>
    `;
  }

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);

    if (changedProperties.has("open")) {
      if (this.open) {
        this.showDialog();
      } else {
        this.closeDialog();
      }
    }
  }

  /**
   * Runs a command sent to the modal by an invoker button: `--show-modal`,
   * `--close` and `--request-close`. Override it to add commands, and call
   * `super.handleCommand(event)` for these.
   */
  protected handleCommand(event: CommandEvent) {
    // `source` is the native button, or the host of a `button` component.
    const value = (event.source as { value?: unknown } | null)?.value;
    const returnValue = typeof value === "string" && value !== "" ? value : undefined;
    switch (event.command) {
      case "--show-modal":
        this.showModal();
        break;
      case "--close":
        this.close(returnValue);
        break;
      case "--request-close":
        this.requestCloseFor("imperative", returnValue);
        break;
    }
  }

  private showDialog() {
    const dialog = this.dialog;
    // Reopened during its exit transition: it never closed.
    cancelExitTransition(dialog);
    if (!dialog.open) {
      this.returnValue = "";
      dialog.showModal();
      void this.focusInitial();
    }
  }

  /**
   * Gives the focus as the dialog's focusing steps would, across the slot:
   * to the content's `autofocus` element, or else to the close button.
   * Firefox and Safari only look for `autofocus` in the shadow root. Opened
   * on its first render, the modal has a close button without its native
   * `<button>` yet, and the dialog keeps the focus: focus again once the
   * element has rendered, unless the focus moved meanwhile.
   */
  private async focusInitial() {
    const target =
      this.querySelector<HTMLElement>("[autofocus]") ??
      this.renderRoot.querySelector<HTMLElement>(".close");
    if (!target) {
      return;
    }
    target.focus();
    if (this.shadowRoot?.activeElement === this.dialog && "updateComplete" in target) {
      await (target as LitElement).updateComplete;
      if (this.dialog.open && this.shadowRoot?.activeElement === this.dialog) {
        target.focus();
      }
    }
  }

  private closeDialog() {
    const dialog = this.dialog;
    if (dialog.open && !isClosing(dialog)) {
      void closeWithTransition(dialog, () => dialog.close());
    }
  }

  /** Fires `u-cancel` for `reason`, then closes unless a listener canceled it. */
  private requestCloseFor(reason: ModalCancelReason, returnValue?: string, cancelable = true) {
    if (this.open && this.dispatchEvent(new ModalCancelEvent(reason, { cancelable }))) {
      this.close(returnValue);
    }
  }

  /** Escape: the cause of the browser's `cancel`, which follows in the same task. */
  private handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.escapeKey = true;
      setTimeout(() => {
        this.escapeKey = false;
      });
    }
  }

  /**
   * A close request of the system: Escape, or the back button or gesture
   * of Android.
   * Closes through `u-cancel` and the exit transition, not at once.
   */
  private handleDialogCancel(event: Event) {
    event.preventDefault();
    const reason = this.escapeKey ? "escape-key" : "back";
    this.escapeKey = false;
    // Safari ignores `closedby`: honor "none" here.
    if (this.closedBy === "none") {
      return;
    }
    // Not cancelable: the browser closes the dialog anyway.
    this.requestCloseFor(reason, undefined, event.cancelable);
  }

  /**
   * Fires whenever the native <dialog> closes, regardless of cause — the
   * single place that keeps `open` truthful to the actual dialog state and
   * announces the closing.
   */
  private handleDialogClose() {
    // The browser fires `close` in a later task. Reopened by then (moved in
    // the DOM, or `close()` then `showModal()`), the modal never closed.
    if (this.dialog.open) {
      return;
    }
    this.open = false;
    this.dispatchEvent(new ModalCloseEvent(this.returnValue));
  }

  private handleCloseButton() {
    this.requestCloseFor("close-press");
  }

  /** A click on the backdrop targets the dialog, outside its box. */
  private isOutside(event: PointerEvent) {
    const box = this.dialog.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }

  private handlePointerDown(event: PointerEvent) {
    this.pressedOutside = this.isOutside(event);
  }

  /**
   * `closedby="any"`, in every browser: the dialog renders `closerequest`,
   * and the modal closes on a press outside itself, to give `u-cancel` its
   * reason. Safari has no `closedby`. Press and release outside: a text
   * selection that ends on the backdrop doesn't close it.
   */
  private handlePointerUp(event: PointerEvent) {
    if (this.closedBy !== "any") {
      return;
    }
    if (this.pressedOutside && this.isOutside(event)) {
      this.requestCloseFor("outside-press");
    }
  }
}
