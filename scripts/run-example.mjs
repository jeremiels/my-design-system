// Builds the base, packs it exactly as it would be published, then installs,
// builds and tests the example brand design system against that tarball
// (ADR 0001, D6). Tooling (Vite, TypeScript, the manifest analyzer,
// Playwright) is resolved from the repository's node_modules.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const example = join(root, "examples/acme-design-system");
const run = (args, cwd = root) => execFileSync("npm", args, { cwd, stdio: "inherit" });

run(["run", "build"]);
rmSync(join(example, ".base"), { recursive: true, force: true });
mkdirSync(join(example, ".base"));
run(["pack", "--pack-destination", join(example, ".base")]);
// npm would keep a previously installed copy of the same version.
rmSync(join(example, "node_modules/my-design-system"), { recursive: true, force: true });
run(["install", "--no-package-lock", "--no-audit", "--no-fund"], example);
run(["run", "build"], example);
run(["test"], example);
