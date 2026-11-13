import { resolve } from "node:path";
import { defineConfig } from "vite";
// The base ships the plugin that compiles `with { type: "css" }` imports.
import { cssImportAttributes } from "@unicorne/components/vite-plugin";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [cssImportAttributes()],
  build: {
    cssCodeSplit: true,
    lib: {
      entry: {
        index: resolve(root, "src/index.ts"),
        define: resolve(root, "src/define.ts"),
        // Also loaded on demand by src/design-system.ts: its own chunk.
        "acme-button": resolve(root, "src/components/acme-button/acme-button.ts"),
        styles: resolve(root, "src/styles.css"),
        reset: resolve(root, "src/reset.css"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      // Republish, don't bundle: Lit and the base stay dependencies, so the
      // app gets a single copy of each.
      external: [/^lit/, /^@unicorne\//],
    },
  },
});
