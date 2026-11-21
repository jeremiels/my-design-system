import { html } from "lit";
import { property } from "lit/decorators.js";
import { RovingFocusController } from "../../controllers/roving-focus.js";
import type { Orientation } from "../../types/common.js";
import { DSBaseElement } from "../base-element.js";
import toolbarStyles from "./toolbar.css" with { type: "css" };
import toolbarTokens from "./toolbar.tokens.css" with { type: "css" };

/**
 * A toolbar: a group of controls, the buttons of an editor for instance,
 * reached with a single Tab. The arrow keys of the orientation move between
 * them, looping, along the text direction; Home and End reach the first and
 * the last. Tab comes back to the control the user left (ADR 0020).
 *
 * Its controls are its children: native buttons, or components that
 * delegate their focus (`button`). A disabled control is skipped. A text
 * field doesn't belong in a toolbar: its arrow keys move the caret.
 *
 * @element u-toolbar
 * @summary A group of controls reached with a single Tab.
 * @slot - The controls.
 * @csspart toolbar - The element of the `toolbar` role.
 * @tokens toolbar - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/toolbar/`): `npm run analyze` documents them.
 */
export class Toolbar extends DSBaseElement {
  static override componentName = "toolbar";

  static styles = [super.styles ?? [], toolbarTokens, toolbarStyles];

  /** The accessible name of the toolbar: what its controls act on. Required. */
  @property({ type: String })
  label = "";

  /** The direction of the controls: in a row, or one below the other. Reflected. */
  @property({ type: String, reflect: true })
  orientation: Orientation = "horizontal";

  /** The control the user last focused: Tab comes back to it. */
  #last = 0;

  constructor() {
    super();
    new RovingFocusController(this, {
      items: () => this.items,
      activeIndex: () => this.#last,
      axis: () => (this.orientation === "vertical" ? "vertical" : "horizontal"),
      homeEnd: true,
      moved: (index) => {
        this.#last = index;
      },
    });
    this.addEventListener("focusin", (event) => {
      const path = event.composedPath();
      const index = this.items.findIndex((item) => path.includes(item));
      if (index >= 0 && index !== this.#last) {
        this.#last = index;
        this.requestUpdate();
      }
    });
  }

  /** The controls, in order. None on a server: the element has no children there. */
  protected get items(): readonly HTMLElement[] {
    return Array.from(this.children ?? []).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
  }

  render() {
    return html`
      <div
        part="toolbar"
        class="toolbar"
        role="toolbar"
        aria-label=${this.label}
        aria-orientation=${this.orientation}
      >
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
    `;
  }
}
