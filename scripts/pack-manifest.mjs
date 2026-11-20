// The package.json of a package, as published: without the `@unicorne/source`
// condition, which points to TypeScript sources the archive leaves out
// (ADR 0003). npm runs `prepack` before it packs the package and `postpack`
// after: `node ../../scripts/pack-manifest.mjs prepack|postpack`, in the
// package's directory.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const SOURCE = "@unicorne/source";
const manifest = "package.json";
const saved = ".package.json.packing";

/** `exports` without the source condition, at any depth. */
function withoutSource(value) {
  if (Array.isArray(value)) {
    return value.map(withoutSource);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== SOURCE)
      .map(([key, entry]) => [key, withoutSource(entry)]),
  );
}

/** Puts the package.json of the repository back, after a pack or a failed one. */
function restore() {
  if (existsSync(saved)) {
    renameSync(saved, manifest);
  }
}

const step = process.argv[2];
if (step === "prepack") {
  restore();
  const text = readFileSync(manifest, "utf8");
  const pkg = JSON.parse(text);
  writeFileSync(saved, text);
  writeFileSync(
    manifest,
    `${JSON.stringify({ ...pkg, exports: withoutSource(pkg.exports) }, null, 2)}\n`,
  );
} else if (step === "postpack") {
  restore();
} else {
  throw new Error(`pack-manifest: expected "prepack" or "postpack", not "${step}".`);
}
