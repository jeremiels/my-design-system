import { resolve } from "node:path";
import { defineConfig } from "vite";
// The base ships the plugin that compiles `with { type: "css" }` imports.
import { cssImportAttributes } from "my-design-system/vite-plugin";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [cssImportAttributes()],
  build: {
    cssCodeSplit: true,
    lib: {
      entry: {
        index: resolve(root, "src/index.ts"),
        define: resolve(root, "src/define.ts"),
        styles: resolve(root, "src/styles.css"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rolldownOptions: {
      // Republish, don't bundle: Lit and the base stay dependencies, so the
      // app gets a single copy of each.
      external: [/^lit/, /^my-design-system/],
    },
  },
});
