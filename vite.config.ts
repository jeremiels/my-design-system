import { defineConfig } from "vite";
import { resolve } from "path";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { cssImportAttributes } from "./plugins/css-import-attributes.ts";

// Supported browsers live in package.json "browserslist" (see
// src/docs/architecture/browser-support.mdx); JS and CSS are lowered to them.
const browserTargets = browserslistToEsbuild();

export default defineConfig({
  // `import sheet from "./x.css" with { type: "css" }` in components/mixins.
  plugins: [cssImportAttributes()],
  build: {
    target: browserTargets,
    // Also applies to component CSS (`?inline`), lowered by Lightning CSS.
    cssTarget: browserTargets,
    // Lib mode defaults this to false (one merged CSS file); we need it on
    // so the standalone CSS entries ("styles", "reset") are emitted on their own.
    cssCodeSplit: true,
    lib: {
      // One entry per public module, so consumers can import just what they
      // need (e.g. "my-design-system/button") and bundlers can tree-shake
      // the rest. Shared code (base classes, mixins, tokens) is split into
      // common chunks automatically by Rollup.
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        // Side effect: registers the catalog under the default `u-` prefix.
        define: resolve(__dirname, "src/define.ts"),
        // Tokens + utilities: everything the components need, nothing that
        // styles the host page. The reset is a separate, opt-in sheet.
        styles: resolve(__dirname, "src/styles/main.css"),
        reset: resolve(__dirname, "src/styles/reset.css"),
        button: resolve(__dirname, "src/components/button/button.ts"),
        "button-link": resolve(__dirname, "src/components/button/button-link.ts"),
        alert: resolve(__dirname, "src/components/alert/alert.ts"),
        modal: resolve(__dirname, "src/components/modal/modal.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Don’t bundle lit, consumers should install their own
      external: /^lit/,
    },
  },
  optimizeDeps: {
    // Pre-bundle every Lit entry point the code imports. Otherwise Vite
    // discovers one mid-run in Vitest/Storybook (e.g. lit/static-html.js),
    // re-optimizes, and already-loaded test iframes fail on a cold cache.
    // Add any new `lit/...` import here.
    include: ["lit", "lit/decorators.js", "lit/directives/if-defined.js", "lit/static-html.js"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"), // so you can do `import X from "@/components/..."`
    },
  },
});
