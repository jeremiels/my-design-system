import { fileURLToPath } from "node:url";

/** What the Terrazzo plugins of `@unicorne/tokens` share: their resolver, and the names of the tokens. */

/**
 * The resolver of a Terrazzo config (`*.resolver.json`): its only token
 * source. Throws when the config has another source, or none.
 */
export function resolverFileOf(config: { tokens: readonly URL[] }, plugin: string): string {
  const files = config.tokens.map((url) => fileURLToPath(url));
  const resolvers = files.filter((file) => file.endsWith(".resolver.json"));
  if (resolvers.length !== 1 || files.length !== 1) {
    throw new Error(`${plugin}: set the resolver (*.resolver.json) as the only token source.`);
  }
  return resolvers[0]!;
}

/** A component token group whose custom properties take another prefix. */
export interface PrefixedGroup {
  /** Custom property prefix, when not the build's: `acme` for a brand's own component. */
  prefix?: string;
}

/**
 * The custom property of a token: `color.action.background` gives
 * `--u-color-action-background`. A component group can take its own prefix:
 * `card.padding` gives `--acme-card-padding`.
 */
export function cssVariable(
  id: string,
  prefix: string,
  groups: Readonly<Record<string, PrefixedGroup>> = {},
): string {
  return `--${groups[id.split(".")[0]!]?.prefix ?? prefix}-${id.replaceAll(".", "-")}`;
}

/**
 * A text style as the value of the `font` shorthand, each part a `var()`:
 * `var(--u-font-weight-semibold) var(--u-font-size-2xl)/var(--u-font-line-height-heading) var(--u-font-family-body)`.
 * The shorthand holds no letter spacing: the class sets it apart.
 */
export function fontShorthand(parts: Readonly<Record<string, string>>): string {
  const missing = ["font-weight", "font-size", "line-height", "font-family"].filter(
    (part) => parts[part] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(`A text style needs ${missing.join(", ")}.`);
  }
  return `${parts["font-weight"]} ${parts["font-size"]}/${parts["line-height"]} ${parts["font-family"]}`;
}
