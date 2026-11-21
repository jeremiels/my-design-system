import { html, type PropertyValues } from "lit";
import { property, query } from "lit/decorators.js";
import { DSBaseElement } from "../base-element.js";
import detailsStyles from "./details.css" with { type: "css" };
import detailsTokens from "./details.tokens.css" with { type: "css" };

/**
 * A disclosure: a summary the user presses to show or hide the content.
 * Built on the native `<details>` and `<summary>`: the browser gives the
 * button, its state, Enter and Space, and finds the hidden text with the
 * page's search (ADR 0020).
 *
 * The details that share a `name` in the same document or shadow root form
 * an accordion: opening one closes the others, as native `<details name>`.
 * The component does it itself: `name` exists only from Chrome 120,
 * Firefox 130 and Safari 17.2, and doesn't cross the shadow roots.
 *
 * It fires `toggle` when it opens or closes, as a native `<details>`: after
 * the change, without bubbling, whatever the cause.
 *
 * @element u-details
 * @summary A summary that shows or hides its content.
 * @slot - The content, shown while open.
 * @csspart details - The native `<details>`.
 * @csspart summary - The native `<summary>`: the label and the chevron.
 * @csspart content - The wrapper of the content.
 * @fires toggle - After it opens or closes, as a native `<details>`.
 * @tokens details - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/details/`): `npm run analyze` documents them.
 */
export class Details extends DSBaseElement {
  static override componentName = "details";

  static styles = [super.styles ?? [], detailsTokens, detailsStyles];

  /** The summary's text: what the content is about. Required. */
  @property({ type: String })
  label = "";

  /** Whether the content shows. Reflected. */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** The group of an accordion: opening a details closes the others of the same `name`. Reflected. */
  @property({ type: String, reflect: true })
  name = "";

  @query("details") private details?: HTMLDetailsElement;

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);
    if (changedProperties.has("open") && this.open) {
      this.#closeOthers();
    }
  }

  /** The other details of the same `name`, in the same tree: closed. */
  #closeOthers(): void {
    if (!this.name) {
      return;
    }
    const root = this.getRootNode() as Document | ShadowRoot;
    for (const other of root.querySelectorAll<Details>(this.localName)) {
      if (other !== this && other.name === this.name && other.open) {
        other.open = false;
      }
    }
  }

  /** The native `toggle`: `open` follows, and the host fires its own. */
  #onToggle = () => {
    const open = this.details?.open ?? false;
    if (open !== this.open) {
      this.open = open;
    }
    this.dispatchEvent(new Event("toggle"));
  };

  render() {
    return html`
      <details part="details" ?open=${this.open} @toggle=${this.#onToggle}>
        <summary part="summary" class="summary">
          <span class="chevron" aria-hidden="true"></span><span class="label">${this.label}</span>
        </summary>
        <div part="content" class="content"><slot></slot></div>
      </details>
    `;
  }
}
