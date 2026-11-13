// Custom Elements Manifest (ADR 0001, D5): generated from the components'
// JSDoc and TypeScript by `npm run analyze`, committed so API changes show up
// in review, and published with the package (`customElements` field).
import { fileURLToPath } from "node:url";
import { tokensManifest } from "./plugins/cem-plugin.ts";

// The DTCG tokens of @unicorne/tokens, which hold the components' tokens (ADR 0003).
const resolver = fileURLToPath(import.meta.resolve("@unicorne/tokens/resolver.json"));

export default {
  globs: ["src/**/*.ts"],
  exclude: [
    "src/**/*.stories.ts",
    "src/**/*.test.ts",
    "src/**/*.d.ts",
    // Registration plumbing, not components (its anonymous subclass would be
    // reported as one).
    "src/registry/**",
    "src/define.ts",
  ],
  outdir: ".",
  litelement: true,
  plugins: [
    // `@tokens button`: the component's tokens, from the DTCG tokens (ADR 0002).
    tokensManifest({ resolver, prefix: "u" }),
    {
      // `dispatchEvent(new ModalCloseEvent())` yields an unnamed event next to
      // the documented one (`@fires u-close`): keep documented events only.
      name: "drop-unnamed-events",
      packageLinkPhase({ customElementsManifest }) {
        for (const module of customElementsManifest.modules) {
          for (const declaration of module.declarations ?? []) {
            if (declaration.events) {
              declaration.events = declaration.events.filter((event) => event.name);
            }
          }
        }
      },
    },
  ],
};
