import { nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html } from "lit/static-html.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { TagRemoveEvent } from "../../events/tag-remove.js";
import { Icon } from "../icon/icon.js";
import tagStyles from "./tag.css" with { type: "css" };
import tagTokens from "./tag.tokens.css" with { type: "css" };

/**
 * A tag: a keyword that classifies something, a filter applied, or a
 * value chosen among several (ADR 0027). Several tags in a row form a
 * list: put them in a `tag-group`.
 *
 * A `removable` tag has a remove button after its text, named by
 * `removeMessage`: the name holds the text of the tag. Pressing it fires
 * `u-remove`; the application removes the tag, and a `tag-group` moves the
 * focus to a neighbor.
 *
 * @element u-tag
 * @summary A keyword, which the user may remove.
 * @slot - The text of the tag.
 * @csspart tag - The tag.
 * @csspart remove-button - The remove button of a `removable` tag.
 * @csspart remove-icon - Its icon: the `icon` component of the same registration.
 * @fires {TagRemoveEvent} u-remove - When the user presses the remove button. The tag stays until the application removes it.
 * @tokens tag - Its tokens (`@cssprop`), shared with `tag-group`, from `@unicorne/tokens` (`src/component/tag/`): `npm run analyze` documents them.
 */
export class Tag extends DSBaseElement {
  static override componentName = "tag";

  /** Renders its remove icon with the `icon` of its own registration. */
  static override dependencies = [Icon];

  static shadowRootOptions: ShadowRootInit = { ...super.shadowRootOptions, delegatesFocus: true };

  static styles = [super.styles ?? [], tagTokens, tagStyles];

  /** Whether the tag has a remove button. Reflected. */
  @property({ type: Boolean, reflect: true })
  removable = false;

  /**
   * Writes the accessible name of the remove button from the text of the
   * tag: it must hold that text. Give it in the page's language. Property
   * only.
   */
  @property({ attribute: false })
  removeMessage: (text: string) => string = (text) => `Remove ${text}`.trim();

  /** The text of the tag, read once rendered: the first render depends on properties only. */
  @state()
  private text = "";

  protected override firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);
    this.#readText();
  }

  render() {
    const icon = this.tagFor(Icon);
    return html`<span part="tag" class="tag"
      ><span class="text"><slot @slotchange=${this.#readText}></slot></span>${
        this.removable
          ? html`<button
              part="remove-button"
              class="remove"
              type="button"
              aria-label=${this.removeMessage(this.text)}
              @click=${this.#remove}
            >
              <${icon} part="remove-icon" name="close"></${icon}>
            </button>`
          : nothing
      }</span
    >`;
  }

  #readText = () => {
    this.text = (this.textContent ?? "").replace(/\s+/g, " ").trim();
  };

  #remove = () => {
    this.dispatchEvent(new TagRemoveEvent());
  };
}
