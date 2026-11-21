import { html } from "lit";
import { property } from "lit/decorators.js";
import { DSBaseElement } from "../../bases/base-element.js";
import { Tag } from "../tag/tag.js";
import tagTokens from "../tag/tag.tokens.css" with { type: "css" };
import tagGroupStyles from "./tag-group.css" with { type: "css" };

/**
 * A group of tags: a list, named by `label`, whose items are its children,
 * `tag` elements (ADR 0027).
 *
 * The host has `role="list"`, and each child `role="listitem"`. When the
 * application removes a tag after its `u-remove`, the focus moves to the
 * tag that takes its place, or else to the one before it, or else to the
 * group: it doesn't fall back to the top of the page.
 *
 * @element u-tag-group
 * @summary A labelled list of tags.
 * @slot - The tags.
 * @tokens tag - Its tokens (`@cssprop`), shared with `tag`, from `@unicorne/tokens` (`src/component/tag/`): `npm run analyze` documents them.
 */
export class TagGroup extends DSBaseElement {
  static override componentName = "tag-group";

  /** Its tags: registering the group registers them. */
  static override dependencies = [Tag];

  static styles = [super.styles ?? [], tagTokens, tagGroupStyles];

  /** The accessible name of the list: what the tags are, "Filters applied" for instance. */
  @property({ type: String })
  label = "";

  /** The tag whose `u-remove` came last, and its place, until the application removes it. */
  #removing?: { tag: Element; index: number };

  #observer?: MutationObserver;

  constructor() {
    super();
    this.addEventListener("u-remove", (event) => {
      const tag = event.target as Element;
      const index = Array.prototype.indexOf.call(this.children, tag);
      this.#removing = index < 0 ? undefined : { tag, index };
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
    }
    this.#markItems();
    this.#observer ??= new MutationObserver(() => {
      this.#markItems();
      this.#focusAfterRemoval();
    });
    this.#observer.observe(this, { childList: true });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  protected override updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    if (this.label) {
      this.setAttribute("aria-label", this.label);
    } else {
      this.removeAttribute("aria-label");
    }
  }

  render() {
    return html`<slot></slot>`;
  }

  /** Each child is an item of the list. */
  #markItems(): void {
    for (const child of this.children) {
      if (!child.hasAttribute("role")) {
        child.setAttribute("role", "listitem");
      }
    }
  }

  /** The focus was in the tag the application removed: to a neighbor, or to the group. */
  #focusAfterRemoval(): void {
    const removing = this.#removing;
    if (!removing || removing.tag.parentElement === this) {
      return;
    }
    this.#removing = undefined;
    // The focus of the group's tree: a group can live in a shadow root.
    const root = this.getRootNode() as Document | ShadowRoot;
    const active = root.activeElement;
    if (active && active !== document.body) {
      return;
    }
    const tags = this.children;
    const next = (tags[removing.index] ?? tags[removing.index - 1]) as HTMLElement | undefined;
    next?.focus();
    if (!this.contains(root.activeElement)) {
      this.tabIndex = -1;
      this.focus();
    }
  }
}
