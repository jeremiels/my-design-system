// Checks every source .css file against package.json "browserslist" (doiuse,
// caniuse data). Exits 1 on any finding not reviewed in IGNORED below.
//
// doiuse only knows caniuse features: it misses color-mix(), text-wrap,
// ::backdrop inheritance, `:state()` and nested at-rules. Those are covered by
// the manual checklist in src/docs/reference/support-navigateurs.mdx. Nesting
// is lowered by Lightning CSS at build time.
//
// Uses doiuse as a PostCSS plugin: its CLI streams files in chunks and fails
// on nested blocks.
import { glob, readFile } from "node:fs/promises";
import { join } from "node:path";
import doiuse from "doiuse";
import postcss from "postcss";

/** Reviewed findings, with why they're fine across the supported matrix. */
const IGNORED = {
  "css-nesting": "Lowered to flat rules by Lightning CSS at build time (build.cssTarget).",
  "css3-cursors": "`cursor` values do nothing on touch-only iOS Safari — harmless there.",
  "intrinsic-width": "Firefox only lacks the `stretch` keyword; `fit-content` works since 94.",
  "text-decoration":
    "Flagged for other longhands; `text-decoration-skip-ink` (reset.css) is supported " +
    "matrix-wide and `auto` is its default anyway.",
};

const root = join(import.meta.dirname, "..");
const findings = [];

for await (const file of glob("src/**/*.css", { cwd: root })) {
  const css = await readFile(join(root, file), "utf8");
  const plugin = doiuse({
    ignore: Object.keys(IGNORED),
    onFeatureUsage: ({ message }) => findings.push(message),
  });
  // `from` lets doiuse find package.json "browserslist" and name the file.
  await postcss([plugin]).process(css, { from: join(root, file) });
}

if (findings.length > 0) {
  console.error(findings.join("\n"));
  console.error(
    `\n${findings.length} CSS feature(s) not supported by the browserslist matrix. ` +
      `Fix them, or add a reviewed entry to IGNORED in scripts/check-css-compat.mjs.`,
  );
  process.exit(1);
}
console.log("CSS compat: no unsupported feature for the browserslist matrix.");
