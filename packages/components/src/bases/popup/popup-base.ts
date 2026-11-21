import type { PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import {
  AnchoredPopoverController,
  anchoredPopoverStyles,
} from "../../controllers/anchored-popover.js";
import { CommandsController } from "../../controllers/commands.js";
import { DismissController, type DismissReason } from "../../controllers/dismiss.js";
import {
  cancelExitTransition,
  closeWithTransition,
  isClosing,
} from "../../controllers/exit-transition.js";
import { PopupToggleEvent, type PopupToggleReason } from "../../events/popup-toggle.js";
import { withDisabled } from "../../mixins/withDisabled.js";
import { DSBaseElement } from "../base-element.js";
import popupBaseStyles from "./popup-base.css" with { type: "css" };
import popupTokens from "./popup.tokens.css" with { type: "css" };

/**
 * Shared base of the popups anchored to a trigger: `menu`. Its popup is a
 * `popover="manual"` of its shadow root, in the top layer, placed by an
 * `AnchoredPopoverController` below its anchor, with an animated entry and
 * exit. Abstract: extend `Menu`, or write a popup with `popup` and `anchor`
 * (ADR 0021).
 *
 * `open` opens and closes it, as do `show()`, `hide()` and `toggle()`, and
 * the commands of the same name from an invoker button: `--show`, `--hide`
 * and `--toggle`. Escape, a press outside the component and the focus
 * leaving it close it (`DismissController`). Each change fires `u-toggle`,
 * with its `reason`, but on the first render.
 *
 * The trigger is a `button` (ADR 0031): declare `Button` in the subclass's
 * `dependencies`. The sheet of the base styles its `class="chevron"` and the
 * popup's transitions (`class="popup"`).
 *
 * @fires {PopupToggleEvent} u-toggle - After the popup opens or closes. Its `newState` is `open` or `closed`, its `reason` the cause.
 * @tokens popup - Its tokens (`@cssprop`), shared by every popup anchored to a trigger, from `@unicorne/tokens` (`src/component/popup/`): `npm run analyze` documents them.
 */
export abstract class PopupBase extends withDisabled(DSBaseElement) {
  static styles = [super.styles ?? [], anchoredPopoverStyles, popupTokens, popupBaseStyles];

  /** Whether the popup is open. Reflected. */
  @property({ type: Boolean, reflect: true })
  open = false;

  #popover = new AnchoredPopoverController(this);

  /** The cause of the next change of `open`. */
  #reason: PopupToggleReason = "imperative";

  constructor() {
    super();
    new CommandsController(this, (event) => this.handleCommand(event));
    new DismissController(this, {
      active: (reason) => this.open && this.dismissesOn(reason),
      dismiss: (reason) => this.hidePopup(reason),
      escapeKey: true,
      outsidePress: true,
      focusOut: true,
    });
  }

  /** Opens the popup, like `open = true` and the `--show` command. */
  show(): void {
    this.showPopup("imperative");
  }

  /** Closes the popup, like `open = false` and the `--hide` command. */
  hide(): void {
    this.hidePopup("imperative");
  }

  /** Opens the popup if it is closed, closes it otherwise, like the `--toggle` command. */
  toggle(): void {
    if (this.open) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** The popup, a `[popover]` of the shadow root. */
  protected abstract get popup(): HTMLElement | null;

  /** The element the popup is anchored below: its trigger. */
  protected abstract get anchor(): HTMLElement | null;

  /** Whether `reason` closes the popup. All three by default. */
  protected dismissesOn(_reason: DismissReason): boolean {
    return true;
  }

  /** Opens the popup for `reason`. Does nothing while disabled. */
  protected showPopup(reason: PopupToggleReason): void {
    if (this.open || this.isDisabled) {
      return;
    }
    this.#reason = reason;
    this.open = true;
  }

  /** Closes the popup for `reason`. */
  protected hidePopup(reason: PopupToggleReason): void {
    if (!this.open) {
      return;
    }
    this.#reason = reason;
    this.open = false;
  }

  /** Called once the popup shows, placed. */
  protected popupShown(_reason: PopupToggleReason): void {}

  /** Called when the popup starts closing. */
  protected popupHidden(_reason: PopupToggleReason): void {}

  /** Runs `--show`, `--hide` and `--toggle`. Override it to add commands, and call `super.handleCommand(event)`. */
  protected handleCommand(event: CommandEvent): void {
    switch (event.command) {
      case "--show":
        this.show();
        break;
      case "--hide":
        this.hide();
        break;
      case "--toggle":
        this.toggle();
        break;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Out of the document, the popover left the top layer: its state follows.
    const popup = this.popup;
    if (popup) {
      cancelExitTransition(popup);
    }
    this.open = false;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (!changedProperties.has("open")) {
      return;
    }
    const firstRender = changedProperties.get("open") === undefined;
    const reason = this.#reason;
    this.#reason = "imperative";
    if (this.open) {
      void this.#show(reason);
    } else if (!firstRender) {
      this.#hide(reason);
    }
    if (!firstRender) {
      this.dispatchEvent(new PopupToggleEvent(this.open ? "open" : "closed", reason));
    }
  }

  async #show(reason: PopupToggleReason): Promise<void> {
    const popup = this.popup;
    const anchor = this.anchor;
    if (!popup || !anchor) {
      return;
    }
    // Opened again during its exit transition: it never closed.
    cancelExitTransition(popup);
    await this.#popover.open(popup, anchor);
    if (this.open) {
      this.popupShown(reason);
    }
  }

  #hide(reason: PopupToggleReason): void {
    const popup = this.popup;
    this.popupHidden(reason);
    if (popup && this.#popover.isOpen(popup) && !isClosing(popup)) {
      void closeWithTransition(popup, () => this.#popover.close(popup));
    }
  }
}
