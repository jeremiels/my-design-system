// `npm run tokens`: each component's sheet, src/components/*/*.tokens.css,
// from the DTCG tokens of @unicorne/tokens (ADR 0002, ADR 0003): its tokens on
// `:host`, one `:host([attribute="context"])` rule per context of its
// modifiers. The page sheet is @unicorne/tokens/tokens.css. The output is
// committed, like custom-elements.json, and `npm run tokens:check` fails when
// it is out of date.
import { createRequire } from "node:module";
import { defineConfig } from "@terrazzo/cli";
import { tokensCss } from "@unicorne/tokens/terrazzo-plugin";

const resolver = createRequire(import.meta.url).resolve("@unicorne/tokens/resolver.json");

export default defineConfig({
  tokens: [resolver],
  outDir: "./src/",
  plugins: [
    tokensCss({
      prefix: "u",
      // The web binding: which host attribute selects each modifier's context.
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
