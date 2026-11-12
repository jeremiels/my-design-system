// `npm run tokens`: the DTCG tokens of tokens/ as the CSS the components read
// (ADR 0002). The output is committed, like custom-elements.json, and
// `npm run tokens:check` fails when it is out of date.
import { defineConfig } from "@terrazzo/cli";
import { tokensCss } from "./plugins/terrazzo-plugin.ts";

export default defineConfig({
  tokens: ["./tokens/u.resolver.json"],
  outDir: "./src/",
  plugins: [
    tokensCss({
      prefix: "u",
      layer: "u.tokens.base",
      page: "styles/tokens.css",
      components: {
        button: {
          file: "components/button/button.tokens.css",
          attributes: { "button-variant": "variant", "button-size": "size" },
        },
        alert: {
          file: "components/alert/alert.tokens.css",
          attributes: { "alert-type": "type" },
        },
        modal: { file: "components/modal/modal.tokens.css" },
      },
    }),
  ],
});
