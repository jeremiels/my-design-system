// The brand's own manifest. `dependencies: true` pulls in the base's manifest
// (its `customElements` field) so components extending the base's classes are
// documented with what they inherit. Its dependency crawl prints
// "Cannot resolve './x.js'" for TypeScript sources (imported as .js); harmless.
import { tokensManifest } from "@unicorne/components/cem-plugin";

export default {
  globs: ["src/**/*.ts"],
  exclude: ["src/define.ts", "src/**/*.d.ts"],
  outdir: ".",
  litelement: true,
  dependencies: true,
  plugins: [
    // `@tokens`: the tokens of ACME's files, from its DTCG tokens. The
    // base's tokens stay documented by the base's manifest, and inherited.
    tokensManifest({
      resolver: "tokens/acme.resolver.json",
      components: { card: { prefix: "acme" } },
      emit: (file) => !file.includes("/node_modules/"),
    }),
  ],
};
