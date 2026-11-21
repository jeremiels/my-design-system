import chevronDown from "@unicorne/icons/chevron-down";
import { html } from "lit/static-html.js";
import { property } from "lit/decorators.js";
import { listboxTokens } from "../../controllers/listbox.js";
import { RovingFocusController } from "../../controllers/roving-focus.js";
import type { PopupToggleReason } from "../../events/popup-toggle.js";
import { emptyTypeahead, isTypeaheadKey, typeahead } from "../../state/typeahead.js";
import type { DSBaseElement } from "../../bases/base-element.js";
import { MenuItem } from "../menu-item/menu-item.js";
import { PopupBase } from "../../bases/popup/popup-base.js";
import { Button } from "../button/button.js";
import { Icon } from "../icon/icon.js";
import menuStyles from "./menu.css" with { type: "css" };

/**
 * A menu button: a button that opens a list of actions, its `menu-item`
 * children. The component renders its trigger, an `outlined` and `neutral`
 * `button` with `popup="menu"`: its control reports `aria-expanded` (ADR
 * 0021, ADR 0031). `label` names the trigger and the menu. The popup and
 * its closing are those of `PopupBase`.
 *
 * Keys of the trigger: Enter, Space and ArrowDown open the menu on its
 * first item, ArrowUp on its last. In the menu: the arrows move between the
 * enabled items, looping; Home and End reach the first and the last; typing
 * the start of a label moves to it; Enter and Space fire the item's `click`.
 * Escape and an item close the menu and give the focus back to the trigger;
 * Tab and a press outside close it.
 *
 * @element u-menu
 * @summary A button that opens a list of actions.
 * @slot - The `menu-item` elements of the same registration.
 * @csspart trigger - The button that opens the menu: the `button` component of the same registration.
 * @csspart menu - The popup, `role="menu"`, in the top layer.
 * @tokens listbox - Its list's tokens (`@cssprop`), shared by every list of options, from `@unicorne/tokens` (`src/component/listbox/`): `npm run analyze` documents them.
 */
export class Menu extends PopupBase {
  static {
    // Its chevrons render at once, on a server too (ADR 0032).
    Icon.bundle({ "chevron-down": chevronDown });
  }

  static override componentName = "menu";

  /** Recognizes its items, and renders its trigger, with the components of its own registration (ADR 0001, D2). */
  static override dependencies: readonly (typeof DSBaseElement)[] = [MenuItem, Button, Icon];

  static styles = [super.styles ?? [], listboxTokens, menuStyles];

  /** The label of the trigger, and the accessible name of the menu. Required. */
  @property({ type: String })
  label = "";

  /** The item that gets the focus once the menu shows. */
  #entry?: "first" | "last";

  /** The item the arrow keys move from. */
  #active = 0;

  #typeahead = emptyTypeahead;

  constructor() {
    super();
    new RovingFocusController(this, {
      items: () => this.items,
      activeIndex: () => this.#active,
      axis: () => "vertical",
      homeEnd: true,
      moved: (index) => {
        this.#active = index;
      },
      isDisabled: (item) => (item as MenuItem).disabled,
    });
    this.addEventListener("keydown", this.#onKeydown);
    this.addEventListener("click", this.#onClick);
  }

  /** The items, in order. None on a server: the element has no children there. */
  protected get items(): readonly MenuItem[] {
    return Array.from(this.children ?? []).filter(
      (child): child is MenuItem => child instanceof MenuItem,
    );
  }

  protected get popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part~="menu"]') ?? null;
  }

  protected get anchor(): HTMLElement | null {
    return this.#trigger;
  }

  get #trigger(): Button | null {
    return this.renderRoot?.querySelector<Button>('[part~="trigger"]') ?? null;
  }

  protected override popupShown(_reason: PopupToggleReason): void {
    const entry = this.#entry;
    this.#entry = undefined;
    if (!entry) {
      return;
    }
    const enabled = this.items.filter((item) => !item.disabled);
    const item = entry === "first" ? enabled[0] : enabled[enabled.length - 1];
    if (item) {
      this.#active = this.items.indexOf(item);
      this.requestUpdate();
      item.focus();
    }
  }

  protected override popupHidden(reason: PopupToggleReason): void {
    this.#typeahead = emptyTypeahead;
    if (reason === "escape-key" || reason === "item-press") {
      this.#trigger?.focus();
    }
  }

  #openOn(entry: "first" | "last"): void {
    this.#entry = entry;
    this.showPopup("trigger-press");
  }

  #onTriggerClick = () => {
    if (this.open) {
      this.hidePopup("trigger-press");
    } else {
      this.#openOn("first");
    }
  };

  #onTriggerKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.#openOn(event.key === "ArrowDown" ? "first" : "last");
    }
  };

  #itemOf(event: Event): MenuItem | undefined {
    const path = event.composedPath();
    return this.items.find((item) => path.includes(item));
  }

  /** In the menu: Enter and Space press the item, a character moves to the item it starts. */
  #onKeydown = (event: KeyboardEvent) => {
    const item = this.#itemOf(event);
    if (!item || !this.open) {
      return;
    }
    if (isTypeaheadKey(event, this.#typeahead, event.timeStamp)) {
      event.preventDefault();
      const items = this.items;
      const result = typeahead(
        this.#typeahead,
        event.key,
        event.timeStamp,
        items.map((candidate) => ({
          label: candidate.textContent?.trim() ?? "",
          disabled: candidate.disabled,
        })),
        items.indexOf(item),
      );
      this.#typeahead = result.state;
      if (result.index >= 0) {
        this.#active = result.index;
        this.requestUpdate();
        items[result.index]!.focus();
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      item.click();
    }
  };

  /** A click on an enabled item, by the pointer or the keys: the menu closes. */
  #onClick = (event: MouseEvent) => {
    const item = this.#itemOf(event);
    if (item && !item.disabled) {
      this.hidePopup("item-press");
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
        popup="menu"
        .expanded=${this.open}
        ?disabled=${this.isDisabled}
        @click=${this.#onTriggerClick}
        @keydown=${this.#onTriggerKeydown}
      >
        <span class="label">${this.label}</span
        ><${this.tagFor(Icon)} class="chevron" name="chevron-down"></${this.tagFor(Icon)}>
      </${button}>
      <div part="menu" class="menu" id="menu" role="menu" aria-label=${this.label} popover="manual">
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
    `;
  }
}
