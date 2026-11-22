// Builds the base's packages, packs them exactly as they would be published,
// then installs, builds and tests the example brand design system against
// those tarballs (ADR 0001, D6; ADR 0003). Then packs ACME the same way, and
// installs, builds and tests the Vue app against ACME's tarball and the
// base's. Tooling the examples don't declare (Vite, TypeScript and the
// manifest analyzer for ACME, Playwright for both) is resolved from the
// repository's node_modules.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const example = join(root, "examples/acme-design-system");
const app = join(root, "examples/acme-vue-app");
const packages = [
  "@unicorne/tokens",
  "@unicorne/icons",
  "@unicorne/components",
  "@unicorne/catalog",
  "@unicorne/cli",
  "@unicorne/mcp",
  "@unicorne/a2ui",
];
const run = (args, cwd = root) => execFileSync("npm", args, { cwd, stdio: "inherit" });

/** Empties `dir`/.base, where a project's package.json finds its tarballs. */
function emptyBase(dir) {
  const base = join(dir, ".base");
  rmSync(base, { recursive: true, force: true });
  mkdirSync(base);
  return base;
}

/**
 * Fails when a published package.json keeps the `@unicorne/source`
 * condition, or when the repository's one wasn't put back
 * (scripts/pack-manifest.mjs).
 */
function checkManifests(dir) {
  for (const tarball of readdirSync(dir)) {
    const manifest = execFileSync("tar", ["-xOzf", join(dir, tarball), "package/package.json"], {
      encoding: "utf8",
    });
    if (manifest.includes('"@unicorne/source"')) {
      throw new Error(`${tarball}: its package.json keeps the @unicorne/source condition.`);
    }
  }
  for (const name of ["tokens", "icons", "components", "catalog", "cli", "mcp", "a2ui"]) {
    const dir = join(root, "packages", name);
    if (existsSync(join(dir, ".package.json.packing"))) {
      throw new Error(`packages/${name}: package.json wasn't put back after npm pack.`);
    }
  }
  if (
    !readFileSync(join(root, "packages/tokens/package.json"), "utf8").includes('"@unicorne/source"')
  ) {
    throw new Error(
      "packages/tokens: npm pack removed the @unicorne/source condition from the repository.",
    );
  }
}

/** Installs from the tarballs in .base, then builds and tests. */
function installBuildTest(dir, scopes) {
  // npm would keep a previously installed copy of the same version.
  for (const scope of scopes) {
    rmSync(join(dir, "node_modules", scope), { recursive: true, force: true });
  }
  run(["install", "--no-package-lock", "--no-audit", "--no-fund"], dir);
  run(["run", "build"], dir);
  run(["test"], dir);
}

// The base → ACME.
run(["run", "build"]);
const exampleBase = emptyBase(example);
run(["pack", ...packages.flatMap((name) => ["-w", name]), "--pack-destination", exampleBase]);
checkManifests(exampleBase);
installBuildTest(example, ["@unicorne"]);

// ACME and the base → the Vue app.
const appBase = emptyBase(app);
run(["pack", "--pack-destination", appBase], example);
for (const tarball of readdirSync(exampleBase)) {
  copyFileSync(join(exampleBase, tarball), join(appBase, tarball));
}
installBuildTest(app, ["@acme", "@unicorne"]);
