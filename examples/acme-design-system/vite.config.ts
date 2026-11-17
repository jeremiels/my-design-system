import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
// The base ships the plugin that compiles `with { type: "css" }` imports.
import { cssImportAttributes } from "@unicorne/components/vite-plugin";

const root = import.meta.dirname;
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

export default defineConfig({
  plugins: [cssImportAttributes()],
  // The version ACME gives its registrations (src/design-system.ts).
  define: { __ACME_VERSION__: JSON.stringify(version) },
  build: {
    cssCodeSplit: true,
    lib: {
      entry: {
        index: resolve(root, "src/index.ts"),
        define: resolve(root, "src/define.ts"),
        // Also loaded on demand by src/design-system.ts: its own chunk.
        "acme-button": resolve(root, "src/components/acme-button/acme-button.ts"),
        styles: resolve(root, "src/styles.css"),
        // ACME's values alone, for a zone of a page of another design system (ADR 0013).
        theme: resolve(root, "src/theme.css"),
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
