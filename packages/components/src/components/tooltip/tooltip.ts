import { html } from "lit";
import type { DismissReason } from "../../controllers/dismiss.js";
import { HoverIntentController } from "../../controllers/hover-intent.js";
import { PopupBase } from "../popup/popup-base.js";
import tooltipStyles from "./tooltip.css" with { type: "css" };
import tooltipTokens from "./tooltip.tokens.css" with { type: "css" };

/** A unique `id` for a content without one: its trigger references it. */
let nextId = 0;

/**
 * A tooltip: a short description of its trigger, shown below it while the
 * pointer rests on it or the keyboard focuses it. Escape and the focus
 * leaving hide it. The popup is that of `PopupBase` (ADR 0022).
 *
 * The pointer can move from the trigger onto the bubble, to read it: the
 * bubble stays (WCAG 1.4.13).
 *
 * The trigger and the text are children of the tooltip: they stay in the
 * tree of the page, where the trigger's `aria-describedby` reaches the
 * text. The tooltip gives the text an `id` if it has none. The trigger is
 * focusable: a native button or link. A component's inner control, the
 * `<button>` of `button`, doesn't get the description.
 *
 * @element u-tooltip
 * @summary A short description of its trigger, shown on hover and focus.
 * @slot - The trigger: a native button or link.
 * @slot content - The text of the tooltip, in an element: `<span slot="content">`.
 * @csspart bubble - The bubble, `role="tooltip"`, in the top layer.
 * @tokens tooltip - Its bubble's tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/tooltip/`): `npm run analyze` documents them.
 */
export class Tooltip extends PopupBase {
  static override componentName = "tooltip";

  static styles = [super.styles ?? [], tooltipTokens, tooltipStyles];

  constructor() {
    super();
    new HoverIntentController(this, {
      show: (reason) => this.showPopup(reason),
      hide: () => this.hidePopup("hover"),
    });
  }

  protected get popup(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('[part~="bubble"]') ?? null;
  }

  protected get anchor(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>(".anchor") ?? null;
  }

  /** Escape and the focus leaving: the pointer's moves are the hover's. */
  protected override dismissesOn(reason: DismissReason): boolean {
    return reason !== "outside-press";
  }

  /** The trigger describes itself with the text: `aria-describedby`, in the tree of the page. */
  #link = () => {
    const trigger = Array.from(this.children ?? []).find((child) => !child.hasAttribute("slot"));
    const content = this.querySelector(':scope > [slot="content"]');
    if (!trigger || !content) {
      return;
    }
    content.id ||= `u-tooltip-${++nextId}`;
    const ids = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    if (!ids.includes(content.id)) {
      trigger.setAttribute("aria-describedby", [...ids, content.id].join(" "));
    }
  };

  render() {
    return html`
      <span class="anchor"><slot @slotchange=${this.#link}></slot></span>
      <div part="bubble" class="popup bubble" role="tooltip" popover="manual">
        <slot name="content" @slotchange=${this.#link}></slot>
      </div>
    `;
  }
}
