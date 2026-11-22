// `npm run tokens`: the DTCG tokens of src/ as the page sheet, css/tokens.css
// (ADR 0002): primitives and semantic tokens, their themes and reduced motion.
// The components' sheets are built by @unicorne/components, from the same
// resolver (ADR 0003). And the token manifest, token-manifest.json: every
// token and its values, for the documentation tools (ADR 0042). The output is
// committed, like custom-elements.json, and `npm run tokens:check` fails when
// it is out of date.
import { defineConfig } from "@terrazzo/cli";
import { tokenManifest, tokensCss } from "./plugins/terrazzo-plugin.ts";

export default defineConfig({
  tokens: ["./src/u.resolver.json"],
  outDir: "./css/",
  plugins: [
    tokensCss({ prefix: "u", layer: "u.tokens.base", page: "tokens.css" }),
    tokenManifest({ file: "../token-manifest.json", prefix: "u" }),
  ],
});
