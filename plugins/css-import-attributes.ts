import { parseSync, Visitor, type ESTree, type Plugin } from "vite";

/**
 * Vite plugin: CSS module scripts (`import sheet from "./x.css" with { type: "css" }`).
 *
 * The default export is a constructable `CSSStyleSheet`, as in the browser
 * standard, so it can go straight into Lit's `static styles`. Vite has no
 * native support for this import attribute yet (vitejs/vite#18534) and
 * Rolldown doesn't pass import attributes to plugin hooks, so the importer is
 * rewritten instead:
 *
 *   import styles from "./x.css" with { type: "css" };
 *   → import styles from "./x.css?css-sheet";
 *   → virtual module wrapping `./x.css?inline` in a `CSSStyleSheet`
 *
 * Going through `?inline` keeps Vite's own CSS pipeline (PostCSS, Lightning
 * CSS lowering/minification at build time). The CSS ends up inlined in the JS
 * output, so consumers need no CSS-module-script support — which matters:
 * Safari doesn't support them at all, nor does Firefox before 147.
 *
 * Handled: static `import x from` / `export { default as x } from` with the
 * attribute. Rejected with an error rather than silently mis-built:
 * dynamic `import()` with the attribute, and a value import of a `.css` file
 * *without* it (Vite would inject the sheet globally and `x` would be
 * `undefined`, although `src/css-modules.d.ts` types it as a `CSSStyleSheet`).
 * Side-effect imports (`import "./main.css"`) and Vite's own query forms
 * (`?inline`, `?url`, `?raw`) are left alone.
 *
 * Exit strategy: once Vite supports `type: "css"` natively, delete this plugin
 * and check that `findUncompiledCssImports` still passes on the native build
 * output (the CSS must stay inlined for Safari) — keep that check as a plugin
 * of its own if needed. Drop `src/css-modules.d.ts` if `vite/client` then
 * types these imports.
 */

const QUERY = "?css-sheet";
const VIRTUAL_PREFIX = "\0css-sheet:";
// Vite routes any id ending in `.css` through its CSS plugin; the `.js` suffix
// keeps this JS virtual module out of it.
const VIRTUAL_SUFFIX = ".sheet.js";

// No query allowed: `./x.css?inline` & co. are Vite's own, valid, forms.
const CSS_SPECIFIER_RE = /\.css$/;
// Any `.css` specifier, with or without query — for the build-output check.
const ANY_CSS_SPECIFIER_RE = /\.css(?:\?|$)/;

/** A CSS import the plugin must not let through; `pos` is a UTF-16 offset. */
export class CssImportError extends Error {
  readonly pos: number;

  constructor(message: string, pos: number) {
    super(message);
    this.name = "CssImportError";
    this.pos = pos;
  }
}

type ModuleDeclaration =
  | ESTree.ImportDeclaration
  | ESTree.ExportNamedDeclaration
  | ESTree.ExportAllDeclaration;

function isModuleDeclaration(node: ESTree.Node): node is ModuleDeclaration {
  return (
    node.type === "ImportDeclaration" ||
    node.type === "ExportNamedDeclaration" ||
    node.type === "ExportAllDeclaration"
  );
}

function hasTypeCss(attributes: readonly ESTree.ImportAttribute[]): boolean {
  return attributes.some((attribute) => {
    const key = attribute.key.type === "Identifier" ? attribute.key.name : attribute.key.value;
    return key === "type" && attribute.value.value === "css";
  });
}

/** `import(x, { with: { type: "css" } })` */
function hasTypeCssOption(options: ESTree.Expression | null): boolean {
  if (options?.type !== "ObjectExpression") return false;
  return options.properties.some(
    (property) =>
      property.type === "Property" &&
      ((property.key.type === "Identifier" && property.key.name === "with") ||
        (property.key.type === "Literal" && property.key.value === "with")) &&
      property.value.type === "ObjectExpression" &&
      property.value.properties.some(
        (attribute) =>
          attribute.type === "Property" &&
          ((attribute.key.type === "Identifier" && attribute.key.name === "type") ||
            (attribute.key.type === "Literal" && attribute.key.value === "type")) &&
          attribute.value.type === "Literal" &&
          attribute.value.value === "css",
      ),
  );
}

function isTypeOnly(node: ModuleDeclaration): boolean {
  return (
    ("importKind" in node && node.importKind === "type") ||
    ("exportKind" in node && node.exportKind === "type")
  );
}

/**
 * Rewrites CSS module script imports to `?css-sheet` imports.
 * Returns `null` when there is nothing to rewrite (or the file doesn't parse —
 * Vite's own transform then reports the syntax error).
 * @throws {CssImportError} for CSS imports that would silently mis-build.
 */
export function rewriteCssImports(code: string, filename: string): string | null {
  const { program, errors } = parseSync(filename, code);
  if (errors.length > 0) return null;

  const edits: { start: number; end: number; text: string }[] = [];

  for (const node of program.body) {
    if (!isModuleDeclaration(node) || !node.source || isTypeOnly(node)) continue;
    const { source } = node;
    if (!CSS_SPECIFIER_RE.test(source.value)) continue;

    if (hasTypeCss(node.attributes)) {
      // `"./x.css" with { type: "css" };` → `"./x.css?css-sheet";`, keeping the
      // original quote/escapes and every line break of the removed clause, so
      // later lines don't shift and the incoming sourcemap stays valid.
      const removed = code.slice(source.end, node.end);
      const semicolon = removed.endsWith(";") ? ";" : "";
      const lineBreaks = "\n".repeat(removed.split("\n").length - 1);
      const quote = code[source.start];
      edits.push({
        start: source.start,
        end: node.end,
        text: `${code.slice(source.start, source.end - 1)}${QUERY}${quote}${semicolon}${lineBreaks}`,
      });
    } else if (node.type !== "ImportDeclaration" || node.specifiers.length > 0) {
      throw new CssImportError(
        `"${source.value}" is imported for its value without \`with { type: "css" }\`: ` +
          `Vite would inject it as a global stylesheet and the import would be undefined. ` +
          `Add the attribute to get a CSSStyleSheet, or use a side-effect import for global CSS.`,
        node.start,
      );
    }
  }

  new Visitor({
    ImportExpression(node) {
      if (hasTypeCssOption(node.options)) {
        throw new CssImportError(
          `Dynamic import() of a CSS module script isn't supported by the css-import-attributes ` +
            `plugin; use a static \`import x from "./x.css" with { type: "css" }\`.`,
          node.start,
        );
      }
    },
  }).visit(program);

  if (edits.length === 0) return null;
  let rewritten = code;
  for (const { start, end, text } of edits.reverse()) {
    rewritten = rewritten.slice(0, start) + text + rewritten.slice(end);
  }
  return rewritten;
}

/**
 * Lists the `.css` imports (or `type: "css"` attributes) left in built JS.
 * Parses instead of grepping so CSS-import examples inside strings (e.g. MDX
 * docs compiled by Storybook) don't count.
 */
export function findUncompiledCssImports(code: string, filename: string): string[] {
  const { program } = parseSync(filename, code);
  const found: string[] = [];
  for (const node of program.body) {
    if (!isModuleDeclaration(node) || !node.source) continue;
    if (ANY_CSS_SPECIFIER_RE.test(node.source.value) || hasTypeCss(node.attributes)) {
      found.push(node.source.value);
    }
  }
  new Visitor({
    ImportExpression(node) {
      const { source } = node;
      if (
        hasTypeCssOption(node.options) ||
        (source.type === "Literal" &&
          typeof source.value === "string" &&
          ANY_CSS_SPECIFIER_RE.test(source.value))
      ) {
        found.push(source.type === "Literal" ? String(source.value) : "import()");
      }
    },
  }).visit(program);
  return found;
}

function sheetModule(cssFile: string, hmr: boolean): string {
  const inline = JSON.stringify(`${cssFile}?inline`);
  if (hmr) {
    // Dev: a CSS edit swaps the rules inside the same sheet object, which every
    // element instance has adopted, so styles update without a page reload.
    return [
      `import cssText from ${inline};`,
      `const sheet = new CSSStyleSheet();`,
      `sheet.replaceSync(cssText);`,
      `export default sheet;`,
      `if (import.meta.hot) {`,
      `  import.meta.hot.accept(${inline}, (mod) => {`,
      `    if (mod) sheet.replaceSync(mod.default);`,
      `  });`,
      `}`,
    ].join("\n");
  }
  // Build: pure-annotated, since building a sheet has no observable side
  // effect, so an imported-but-unused one can be tree-shaken.
  return [
    `import cssText from ${inline};`,
    `export default /* @__PURE__ */ (() => {`,
    `  const sheet = new CSSStyleSheet();`,
    `  sheet.replaceSync(cssText);`,
    `  return sheet;`,
    `})();`,
  ].join("\n");
}

export function cssImportAttributes(): Plugin {
  let isServe = false;

  return {
    name: "css-import-attributes",
    enforce: "pre",

    configResolved(config) {
      isServe = config.command === "serve";
    },

    transform: {
      filter: {
        id: { include: /\.[cm]?[jt]sx?$/, exclude: /\/node_modules\// },
        code: /\.css\b/,
      },
      handler(code, id) {
        try {
          const rewritten = rewriteCssImports(code, id);
          return rewritten === null ? null : { code: rewritten, map: null };
        } catch (error) {
          if (error instanceof CssImportError) this.error(error.message, error.pos);
          throw error;
        }
      },
    },

    async resolveId(source, importer) {
      if (!source.endsWith(QUERY)) return null;
      const resolved = await this.resolve(source.slice(0, -QUERY.length), importer, {
        skipSelf: true,
      });
      if (!resolved) return null;
      return `${VIRTUAL_PREFIX}${resolved.id}${VIRTUAL_SUFFIX}`;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      return sheetModule(id.slice(VIRTUAL_PREFIX.length, -VIRTUAL_SUFFIX.length), isServe);
    },

    // Safari has no CSS module scripts: a `.css` import left in the shipped JS
    // would break every component for Safari users, so fail the build instead.
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        const leftovers = findUncompiledCssImports(output.code, output.fileName);
        if (leftovers.length > 0) {
          this.error(
            `${output.fileName} still imports CSS (${leftovers.join(", ")}). ` +
              `Shipped JS must not import CSS: plain .css imports aren't loadable as modules, ` +
              `and Safari doesn't support CSS module scripts.`,
          );
        }
      }
    },
  };
}
