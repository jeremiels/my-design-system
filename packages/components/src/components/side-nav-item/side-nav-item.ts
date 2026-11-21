import chevronDown from "@unicorne/icons/chevron-down";
import chevronUp from "@unicorne/icons/chevron-up";
import { nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { Icon } from "../icon/icon.js";
import sideNavTokens from "../side-nav/side-nav.tokens.css" with { type: "css" };
import sideNavItemStyles from "./side-nav-item.css" with { type: "css" };

/**
 * An item of a `side-nav`: a link to a page, or a group of items that opens
 * and closes (ADR 0034). The host has `role="listitem"`.
 *
 * Its `side-nav-item` children make it a group: a button, `aria-expanded`
 * and `aria-controls`, shows or hides them, as in the DSFR. A group opens at once when it holds
 * the current page, and its button then has `aria-current="true"`.
 *
 * @element u-side-nav-item
 * @summary A link of a side navigation, or a group of links.
 * @slot - The `side-nav-item` children of a group.
 * @csspart link - The link of an item without children.
 * @csspart toggle - The button of a group: it opens and closes it.
 * @csspart chevron - The chevron of the button: the `icon` component of the same registration.
 * @csspart group - The list of the children, while the group is open.
 * @fires toggle - When the user opens or closes the group. Doesn't bubble, like the `toggle` of `<details>`.
 * @tokens side-nav - Its tokens (`@cssprop`), shared with `side-nav`, from `@unicorne/tokens` (`src/component/side-nav/`): `npm run analyze` documents them.
 */
export class SideNavItem extends DSBaseElement {
  static override componentName = "side-nav-item";

  static override dependencies = [Icon];

  static {
    // Its chevrons render at once, on a server too (ADR 0032).
    Icon.bundle({ "chevron-down": chevronDown, "chevron-up": chevronUp });
  }

  static styles = [super.styles ?? [], sideNavTokens, sideNavItemStyles];

  /** The text of the item: the name of its page, or of its group. Required. */
  @property({ type: String })
  label = "";

  /** The URL of its page. A group has none: its button opens it. */
  @property({ type: String })
  href?: string;

  /** The item of the page the user is on: `aria-current="page"`. Reflected. */
  @property({ type: Boolean, reflect: true })
  current = false;

  /** Whether the children of a group show. Reflected. */
  @property({ type: Boolean, reflect: true })
  expanded = false;

  /** The child items. None on a server: the element has no children there. */
  get items(): readonly SideNavItem[] {
    return Array.from(this.children ?? []).filter(
      (child): child is SideNavItem => child instanceof SideNavItem,
    );
  }

  /** Whether the item, or one of its descendants, is the current page. */
  get #holdsCurrent(): boolean {
    return this.items.some((item) => item.current || item.#holdsCurrent);
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "listitem");
    }
  }

  protected override firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    if (this.#holdsCurrent) {
      this.expanded = true;
    }
  }

  #toggle = () => {
    this.expanded = !this.expanded;
    this.dispatchEvent(new Event("toggle"));
  };

  render() {
    // The same template for a link and a group: a server knows no children,
    // and the page hydrates it as a link first (ADR 0014).
    const group = this.items.length > 0;
    const icon = this.tagFor(Icon);
    return html`
      <a
        part="link"
        class="link"
        href=${ifDefined(this.href)}
        aria-current=${this.current && !group ? "page" : nothing}
        ?hidden=${group}
        >${this.label}</a
      >
      <button
        part="toggle"
        class="toggle"
        type="button"
        aria-expanded=${this.expanded ? "true" : "false"}
        aria-controls="group"
        aria-current=${group && this.#holdsCurrent ? "true" : nothing}
        ?hidden=${!group}
        @click=${this.#toggle}
      >
        <span class="label">${this.label}</span>
        <${icon}
          part="chevron"
          class="chevron"
          name=${this.expanded ? "chevron-up" : "chevron-down"}
        ></${icon}>
      </button>
      <div part="group" class="group" id="group" role="list" ?hidden=${!group || !this.expanded}>
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
    `;
  }
}
