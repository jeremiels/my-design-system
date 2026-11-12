// ACME's tokens as CSS (ADR 0002 of the base): `tz build`, before the build.
// The output (src/theme.css, src/components/*/*.tokens.css) isn't committed.
import { defineConfig } from "@terrazzo/cli";
// The base ships the plugin that writes its own sheets.
import { tokensCss } from "my-design-system/terrazzo-plugin";

export default defineConfig({
  tokens: ["./tokens/acme.resolver.json"],
  outDir: "./src/",
  plugins: [
    tokensCss({
      layer: "u.tokens.brand",
      page: "theme.css",
      components: {
        button: { file: "components/acme-button/acme-button.tokens.css" },
        card: { file: "components/acme-card/acme-card.tokens.css", prefix: "acme" },
      },
      // ACME's tokens only: the base's sheets already have the others.
      emit: (file) => !file.includes("/node_modules/"),
    }),
  ],
});
