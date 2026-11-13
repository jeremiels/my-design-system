import { defineConfig, defaultServerConditions } from "vite";
import { resolve } from "node:path";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { cssImportAttributes } from "./plugins/css-import-attributes.ts";

// Supported browsers live in the root package.json "browserslist" (see
// docs/reference/support-navigateurs.mdx); JS and CSS are lowered to them.
const browserTargets = browserslistToEsbuild();

export default defineConfig({
  // `import sheet from "./x.css" with { type: "css" }` in components/mixins.
  plugins: [cssImportAttributes()],
  // `tz build` loads terrazzo.config.ts through Vite: it imports
  // @unicorne/tokens/terrazzo-plugin from its TypeScript sources, without
  // building @unicorne/tokens first (ADR 0003).
  ssr: { resolve: { conditions: ["@unicorne/source", ...defaultServerConditions] } },
  build: {
    target: browserTargets,
    // Also applies to component CSS (`?inline`), lowered by Lightning CSS.
    cssTarget: browserTargets,
    // Lib mode defaults this to false (one merged CSS file); we need it on
    // so the standalone CSS entries ("styles", "reset") are emitted on their own.
    cssCodeSplit: true,
    lib: {
      // One entry per public module, so consumers can import just what they
      // need (e.g. "@unicorne/components/button") and bundlers can tree-shake
      // the rest. Shared code (base classes, mixins) is split into common
      // chunks automatically by Rollup.
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        // Side effect: registers the catalog under the default `u-` prefix.
        define: resolve(import.meta.dirname, "src/define.ts"),
        // The cascade layers and the utilities: nothing that styles the host
        // page. The token values are @unicorne/tokens/tokens.css. The reset
        // is a separate, opt-in sheet.
        styles: resolve(import.meta.dirname, "src/styles/main.css"),
        reset: resolve(import.meta.dirname, "src/styles/reset.css"),
        button: resolve(import.meta.dirname, "src/components/button/button.ts"),
        "button-link": resolve(import.meta.dirname, "src/components/button/button-link.ts"),
        alert: resolve(import.meta.dirname, "src/components/alert/alert.ts"),
        modal: resolve(import.meta.dirname, "src/components/modal/modal.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Don’t bundle lit, consumers should install their own
      external: /^lit/,
    },
  },
});
