import {
  iconAliases,
  icons,
  type IconLoader,
  type IconSet,
  type IconSource,
} from "@unicorne/icons";
import { html, isServer, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { html as staticHtml, unsafeStatic } from "lit/static-html.js";
import { DSBaseElement, type DesignSystemSettings } from "../../bases/base-element.js";
import iconStyles from "./icon.css" with { type: "css" };
import iconTokens from "./icon.tokens.css" with { type: "css" };

/**
 * The markup of icons of the base that components bundle, by name
 * (`Icon.bundle()`): rendered at once, on a server too (ADR 0032).
 */
const bundled = new Map<string, string>();

/** The markup of every icon loaded on the page: each icon loads once, then renders at once. */
const loaded = new Map<IconLoader, string>();

/** The problems already reported: one warning each. */
const reported = new Set<string>();

/**
 * An icon of the set of its registration, by name (ADR 0005).
 *
 * Each icon loads the first time it renders, so a page downloads only the
 * icons it shows. The box keeps its size while the icon loads, and
 * `updateComplete` resolves once the icon is rendered. The icon takes the
 * color of the text (`currentColor`).
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

  /**
   * Other names of the set's icons: an old name → the icon it renders (ADR
   * 0049). The default is the aliases of `@unicorne/icons`. An alias renders
   * whatever icon its target name has: a brand's icon that replaces the
   * base's renders under both names.
   */
  static aliases: Readonly<Record<string, string>> = iconAliases;

  /**
   * Gives the markup of icons of the base, by name, from the module of a
   * component that draws them: `Icon.bundle({ "chevron-down": chevronDown })`,
   * with `import chevronDown from "@unicorne/icons/chevron-down"`. While the
   * set holds the base's loader for that name, the icon renders this markup
   * at once, on a server too. A brand's icon of the same name still wins.
   */
  static bundle(markup: Readonly<Record<string, string>>): void {
    for (const [name, svg] of Object.entries(markup)) {
      bundled.set(name, svg);
    }
  }

  /**
   * A subclass with the design system's `icons` over the set of this class,
   * or this class when the design system has none.
   */
  static override forDesignSystem<T extends typeof DSBaseElement>(
    this: T,
    { icons: designSystemIcons, iconAliases: designSystemAliases }: DesignSystemSettings,
  ): T {
    if (!designSystemIcons && !designSystemAliases) {
      return this;
    }
    const base = this as unknown as typeof Icon;
    const set: IconSet = { ...base.icons, ...designSystemIcons };
    const aliases = { ...base.aliases, ...designSystemAliases };
    return class extends base {
      static override icons = set;
      static override aliases = aliases;
    } as unknown as T;
  }

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

  /**
   * Whether a server rendered the element (ADR 0014): it then has its shadow
   * root before its first render.
   */
  private serverRendered = !isServer && this.shadowRoot !== null;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (!changedProperties.has("name")) {
      return;
    }
    const source = this.sourceOf(this.name);
    this.loading = undefined;
    if (typeof source !== "function") {
      // A string: rendered at once, on a server too.
      this.markup = source;
      return;
    }
    // A server renders an icon to load empty, whatever it has loaded before:
    // it can't wait for a module. The first render after it matches it.
    const matchesServer = isServer || (this.serverRendered && !this.hasUpdated);
    const cached = matchesServer ? undefined : loaded.get(source);
    this.markup = cached;
    if (cached === undefined && !isServer) {
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
    // A static template: Lit caches it by its markup, so the page parses
    // each icon once, then clones it for every element that shows it.
    const svg = this.markup ? staticHtml`${unsafeStatic(this.markup)}` : nothing;
    return this.label
      ? html`<span part="icon" class="icon" role="img" aria-label=${this.label}>${svg}</span>`
      : html`<span part="icon" class="icon" aria-hidden="true">${svg}</span>`;
  }

  private sourceOf(requested: string): IconSource | undefined {
    const { icons: set, aliases } = this.constructor as typeof Icon;
    // An alias renders the icon it names (ADR 0049).
    const name = Object.hasOwn(aliases, requested) ? aliases[requested]! : requested;
    if (Object.hasOwn(set, name)) {
      const source = set[name];
      // The base's own loader: the markup a component bundled, if any.
      return source === (icons as IconSet)[name] ? (bundled.get(name) ?? source) : source;
    }
    if (requested) {
      this.warn(`no icon "${requested}" in the set of <${this.localName}>; it renders empty.`);
    }
    return undefined;
  }

  private async load(name: string, loader: IconLoader): Promise<void> {
    try {
      // Awaited even when loaded already: the render that matches a
      // server's comes first.
      const markup = await (loaded.get(loader) ?? loader().then((module) => module.default));
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
