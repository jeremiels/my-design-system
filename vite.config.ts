import { defineConfig } from "vite";
import { resolve } from "node:path";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { cssImportAttributes } from "./plugins/css-import-attributes.ts";

// Supported browsers live in package.json "browserslist" (see
// src/docs/reference/support-navigateurs.mdx); JS and CSS are lowered to them.
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
        index: resolve(import.meta.dirname, "src/index.ts"),
        // Side effect: registers the catalog under the default `u-` prefix.
        define: resolve(import.meta.dirname, "src/define.ts"),
        // Tokens + utilities: everything the components need, nothing that
        // styles the host page. The reset is a separate, opt-in sheet.
        styles: resolve(import.meta.dirname, "src/styles/main.css"),
        reset: resolve(import.meta.dirname, "src/styles/reset.css"),
        button: resolve(import.meta.dirname, "src/components/button/button.ts"),
        "button-link": resolve(import.meta.dirname, "src/components/button/button-link.ts"),
        alert: resolve(import.meta.dirname, "src/components/alert/alert.ts"),
        modal: resolve(import.meta.dirname, "src/components/modal/modal.ts"),
        // Tools for brands' tests (a theme's WCAG contrast), not for apps.
        testing: resolve(import.meta.dirname, "src/testing/contrast.ts"),
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
      "@": resolve(import.meta.dirname, "src"), // so you can do `import X from "@/components/..."`
    },
  },
});
