// ACME's tokens as CSS (ADR 0002, ADR 0013 of the base), and its token manifest
// for its documentation tools (ADR 0042): `tz build`, before the build. The
// output (src/theme.css, src/components/*/*.tokens.css, token-manifest.json)
// and the resolver (tokens/.acme.resolver.json) aren't committed.
import { defineConfig } from "@terrazzo/cli";
// The base ships the plugins that write its own sheets and its manifest, and
// writes ACME's resolver: the base's sets and modifiers, then the files of
// tokens/.
import { brandResolver, tokenManifest, tokensCss } from "@unicorne/tokens/terrazzo-plugin";

const components = {
  button: { file: "components/acme-button/acme-button.tokens.css" },
  card: { file: "components/acme-card/acme-card.tokens.css", prefix: "acme" },
};

export default defineConfig({
  tokens: [brandResolver({ name: "acme", sources: "./tokens" })],
  outDir: "./src/",
  plugins: [
    tokensCss({
      // ACME's tokens only, on [data-brand="acme"]: the base's sheets have the others.
      brand: "acme",
      layer: "u.tokens.brand",
      page: "theme.css",
      components,
    }),
    // Every token, the base's with ACME's values, and ACME's own: what `acme`
    // and `acme-mcp` read. Published at the root of the package. Its text
    // styles have ACME's classes, as theme.css writes them (ADR 0051 of the
    // base): .acme-text-heading-xl.
    tokenManifest({ file: "../token-manifest.json", components, classPrefix: "acme" }),
  ],
});
