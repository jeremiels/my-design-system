/**
 * The Lit templates of a script (ADR 0048): each `html` and `css` tagged
 * template of a `.ts` or `.js` file, nested ones included, with where it
 * starts in the file. Each expression, `${…}`, becomes a placeholder of the
 * same length, as eslint-plugin-lit does: the positions of the file stay
 * those of the template, for a diagnostic, a fix or a suggestion.
 */

/** A tagged template of a script. */
export interface ScriptTemplate {
  /** `html` for markup, `css` for a style sheet. */
  readonly kind: "html" | "css";
  /** Its text, each expression a placeholder of the same length. */
  readonly text: string;
  /** The offset of its first character, after the backtick, in the file. */
  readonly offset: number;
}

/** The tags whose templates `check` reads: Lit's, and those of `lit/static-html.js`. */
const TAGS: Readonly<Record<string, ScriptTemplate["kind"]>> = { html: "html", css: "css" };

/**
 * An expression, as a placeholder of its length. In markup, `${___}` keeps a
 * bound value a binding: `variant="${___}"` isn't a value to check. In CSS, a
 * comment keeps the declarations around it.
 */
function placeholder(kind: ScriptTemplate["kind"] | undefined, length: number): string {
  if (kind === "css") {
    return length >= 4 ? `/*${"_".repeat(length - 4)}*/` : " ".repeat(length);
  }
  return `\${${"_".repeat(Math.max(0, length - 3))}}`;
}

/** The characters after which `/` starts a regular expression, not a division. */
const BEFORE_REGEX =
  /(?:^|[(,=:[!&|?{};+\-*%<>~^]|\b(?:return|typeof|case|in|of|new|delete|void|throw|yield|await))\s*$/;

/** Every Lit template of a script, nested ones included, in the order of the file. */
export function scriptTemplates(source: string): ScriptTemplate[] {
  const found: ScriptTemplate[] = [];
  let index = 0;

  /** Past a string: from its quote to the one that closes it. */
  const skipString = (quote: string) => {
    index += 1;
    while (index < source.length && source[index] !== quote && source[index] !== "\n") {
      index += source[index] === "\\" ? 2 : 1;
    }
    index += 1;
  };

  /** Past a regular expression: its classes may hold a `/`. */
  const skipRegex = () => {
    index += 1;
    let inClass = false;
    while (index < source.length && source[index] !== "\n") {
      const char = source[index];
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === "[") {
        inClass = true;
      } else if (char === "]") {
        inClass = false;
      } else if (char === "/" && !inClass) {
        break;
      }
      index += 1;
    }
    index += 1;
    while (/[a-z]/.test(source[index] ?? "")) {
      index += 1;
    }
  };

  /** Code up to the `}` that closes an expression, or to the end of the file. */
  const scanCode = (inExpression: boolean) => {
    let depth = 0;
    while (index < source.length) {
      const char = source[index]!;
      const next = source[index + 1];
      if (char === "/" && next === "/") {
        const end = source.indexOf("\n", index);
        index = end < 0 ? source.length : end;
      } else if (char === "/" && next === "*") {
        const end = source.indexOf("*/", index + 2);
        index = end < 0 ? source.length : end + 2;
      } else if (char === "'" || char === '"') {
        skipString(char);
      } else if (char === "`") {
        const tag = /([A-Za-z_$][\w$]*)\s*$/.exec(
          source.slice(Math.max(0, index - 40), index),
        )?.[1];
        index += 1;
        scanTemplate(tag ? TAGS[tag] : undefined);
      } else if (char === "/" && BEFORE_REGEX.test(source.slice(Math.max(0, index - 20), index))) {
        skipRegex();
      } else {
        if (char === "{") {
          depth += 1;
        } else if (char === "}") {
          if (depth === 0 && inExpression) {
            index += 1;
            return;
          }
          depth -= 1;
        }
        index += 1;
      }
    }
  };

  /** A template, from after its backtick to after the one that closes it. */
  const scanTemplate = (kind: ScriptTemplate["kind"] | undefined) => {
    const offset = index;
    let text = "";
    while (index < source.length && source[index] !== "`") {
      if (source[index] === "\\") {
        text += source.slice(index, index + 2);
        index += 2;
      } else if (source[index] === "$" && source[index + 1] === "{") {
        const start = index;
        index += 2;
        scanCode(true);
        text += placeholder(kind, index - start);
      } else {
        text += source[index];
        index += 1;
      }
    }
    index += 1;
    if (kind) {
      found.push({ kind, text, offset });
    }
  };

  scanCode(false);
  return found.sort((a, b) => a.offset - b.offset);
}

/** The line and the column of an offset of a text, from 1. */
export function positionOf(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset);
  return { line: before.split("\n").length, column: offset - before.lastIndexOf("\n") };
}
