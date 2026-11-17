// ACME's tokens as CSS (ADR 0002, ADR 0013 of the base): `tz build`, before the
// build. The output (src/theme.css, src/components/*/*.tokens.css) and the
// resolver (tokens/.acme.resolver.json) aren't committed.
import { defineConfig } from "@terrazzo/cli";
// The base ships the plugin that writes its own sheets, and writes ACME's
// resolver: the base's sets and modifiers, then the files of tokens/.
import { brandResolver, tokensCss } from "@unicorne/tokens/terrazzo-plugin";

export default defineConfig({
  tokens: [brandResolver({ name: "acme", sources: "./tokens" })],
  outDir: "./src/",
  plugins: [
    tokensCss({
      // ACME's tokens only, on [data-brand="acme"]: the base's sheets have the others.
      brand: "acme",
      layer: "u.tokens.brand",
      page: "theme.css",
      components: {
        button: { file: "components/acme-button/acme-button.tokens.css" },
        card: { file: "components/acme-card/acme-card.tokens.css", prefix: "acme" },
      },
    }),
  ],
});
