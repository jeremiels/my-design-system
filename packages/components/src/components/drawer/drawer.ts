import { property } from "lit/decorators.js";
import { ModalBase } from "../../bases/modal/modal-base.js";
import drawerStyles from "./drawer.css" with { type: "css" };
import drawerTokens from "./drawer.tokens.css" with { type: "css" };
import type { DrawerPlacement } from "./drawer.type.js";

/**
 * A drawer: a modal panel along an edge of the page, for a navigation, the
 * filters of a list, the details of an item. Its behavior is that of
 * `ModalBase`: the native `<dialog>`, its commands (`--show-modal`,
 * `--close`, `--request-close`), `u-cancel` and `u-close` (ADR 0022).
 *
 * It slides from the `start` edge, along the text, or from the `end` one.
 * With reduced motion, it appears and disappears at once.
 *
 * @element u-drawer
 * @summary A modal panel along an edge of the page.
 * @tokens drawer - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/drawer/`): `npm run analyze` documents them.
 */
export class Drawer extends ModalBase {
  static override componentName = "drawer";

  static styles = [super.styles ?? [], drawerTokens, drawerStyles];

  /** The edge it slides from, along the text: `start` (left in left-to-right text) or `end`. Reflected. */
  @property({ type: String, reflect: true })
  placement: DrawerPlacement = "start";

  /** Whether the text runs right to left: `start` is on the right. */
  #rtl = false;

  override connectedCallback(): void {
    super.connectedCallback();
    // The slide is physical, and `:dir()` is missing before Chrome 120.
    const rtl = getComputedStyle(this).direction === "rtl";
    if (rtl !== this.#rtl) {
      this.#rtl = rtl;
      this.toggleAttribute("data-rtl", rtl);
    }
  }
}
