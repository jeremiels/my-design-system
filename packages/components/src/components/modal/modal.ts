import { ModalBase } from "./modal-base.js";
import modalStyles from "./modal.css" with { type: "css" };
import modalTokens from "./modal.tokens.css" with { type: "css" };

/**
 * A modal dialog, centered over the page. Its behavior is that of
 * `ModalBase`: the native `<dialog>`, its commands, `u-cancel` and
 * `u-close`.
 *
 * It enters and leaves with a fade and a slight scale, set by its tokens.
 * With reduced motion, it appears and disappears at once.
 *
 * @element u-modal
 * @summary A modal dialog.
 * @tokens modal - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/modal/`): `npm run analyze` documents them.
 */
export class Modal extends ModalBase {
  static override componentName = "modal";

  static styles = [super.styles ?? [], modalTokens, modalStyles];
}
