import { icons, type IconLoader, type IconSet, type IconSource } from "@unicorne/icons";
import { html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { DSBaseElement } from "../base-element.js";
import iconStyles from "./icon.css" with { type: "css" };
import iconTokens from "./icon.tokens.css" with { type: "css" };

/** The markup of every icon loaded on the page: each icon loads once, then renders at once. */
const loaded = new Map<IconLoader, string>();

/** The problems already reported: one warning each. */
const reported = new Set<string>();

/**
 * An icon of the set of its registration, by name (ADR 0005).
 *
 * The set of the base is `@unicorne/icons`: one module per icon, loaded the
 * first time an icon renders, so a page downloads only the icons it shows.
 * The box keeps its size while the icon loads, and `updateComplete` resolves
 * once the icon is rendered. The icon takes the color of the text
 * (`currentColor`).
 *
 * Without `label`, the icon is decorative: assistive technologies ignore it.
 * Give a `label` to an icon that carries meaning on its own.
 *
 * @element u-icon
 * @summary Displays an icon of the set, by name.
 * @csspart icon - The box of the icon, around its `<svg>`.
 * @tokens icon - Its tokens (`@cssprop`), from `@unicorne/tokens` (`src/component/icon/`): `npm run analyze` documents them.
 */
export class Icon extends DSBaseElement {
  static override componentName = "icon";

  /**
   * The icon set: icon name → its SVG markup, or a loader of its module.
   * The default is the set of `@unicorne/icons`. A brand adds or replaces
   * icons by name in a subclass, registered with `overrides: { icon: … }`,
   * so every component of the registration renders them:
   * `static override icons = { ...Icon.icons, ...brandIcons }`.
   * Rendered as HTML: trusted markup only, such as the output of `unicorne-icons`.
   */
  static icons: IconSet = icons;

  /** Name of the icon in the set. */
  @property({ type: String })
  name = "";

  /** Accessible name. Without it, the icon is decorative. */
  @property({ type: String })
  label?: string;

  static styles = [DSBaseElement.styles ?? [], iconTokens, iconStyles];

  /** The SVG markup of `name`, once available. */
  @state()
  private markup?: string;

  /** The load of the current `name`, until it settles. */
  private loading?: Promise<void>;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (!changedProperties.has("name")) {
      return;
    }
    const source = this.sourceOf(this.name);
    // A string, or an icon already loaded on the page: rendered at once.
    this.markup = typeof source === "string" ? source : source && loaded.get(source);
    this.loading = undefined;
    if (typeof source === "function" && this.markup === undefined) {
      const loading = this.load(this.name, source);
      this.loading = loading;
      void loading.finally(() => {
        if (this.loading === loading) {
          this.loading = undefined;
        }
      });
    }
  }

  /**
   * Also waits for the icon: once settled, its `<svg>` is rendered.
   * @internal
   */
  protected override async getUpdateComplete(): Promise<boolean> {
    let result = await super.getUpdateComplete();
    while (this.loading) {
      await this.loading;
      result = await super.getUpdateComplete();
    }
    return result;
  }

  render() {
    const svg = this.markup ? unsafeHTML(this.markup) : nothing;
    return this.label
      ? html`<span part="icon" class="icon" role="img" aria-label=${this.label}>${svg}</span>`
      : html`<span part="icon" class="icon" aria-hidden="true">${svg}</span>`;
  }

  private sourceOf(name: string): IconSource | undefined {
    const set = (this.constructor as typeof Icon).icons;
    if (Object.hasOwn(set, name)) {
      return set[name];
    }
    if (name) {
      this.warn(`no icon "${name}" in the set of <${this.localName}>; it renders empty.`);
    }
    return undefined;
  }

  private async load(name: string, loader: IconLoader): Promise<void> {
    try {
      const { default: markup } = await loader();
      loaded.set(loader, markup);
      if (this.name === name) {
        this.markup = markup;
      }
    } catch (error) {
      this.warn(
        `icon "${name}" of <${this.localName}> failed to load (${error}); it renders empty.`,
      );
    }
  }

  private warn(problem: string) {
    if (!reported.has(problem)) {
      reported.add(problem);
      // oxlint-disable-next-line no-console -- the page works, without this icon
      console.warn(problem);
    }
  }
}
