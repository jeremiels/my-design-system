import { defineConfig } from "vite";
import { resolve } from "path";
import { cssImportAttributes } from "./plugins/css-import-attributes.ts";

export default defineConfig({
  // `import sheet from "./x.css" with { type: "css" }` in components/mixins.
  plugins: [cssImportAttributes()],
  build: {
    // Lib mode defaults this to false (one merged CSS file); we need it on
    // so the standalone "styles" CSS entry can be emitted on its own.
    cssCodeSplit: true,
    lib: {
      // One entry per public module, so consumers can import just what they
      // need (e.g. "my-design-system/button") and bundlers can tree-shake
      // the rest. Shared code (base classes, mixins, tokens) is split into
      // common chunks automatically by Rollup.
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        styles: resolve(__dirname, "src/styles/main.css"),
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
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"), // so you can do `import X from "@/components/..."`
    },
  },
});
