// The development environment of the monorepo: the demo (index.html),
// Storybook and Vitest. Each package builds with its own config
// (packages/components/vite.config.ts).
import { resolve } from "node:path";
import { defaultClientConditions, defaultServerConditions, defineConfig } from "vite";
import { cssImportAttributes } from "./packages/components/plugins/css-import-attributes.ts";

// A package imports another from its TypeScript sources, without building it
// first (ADR 0003): the exports maps of the packages have this condition.
const SOURCE = "@unicorne/source";

export default defineConfig({
  // `import sheet from "./x.css" with { type: "css" }` in components/mixins.
  plugins: [cssImportAttributes()],
  resolve: {
    conditions: [SOURCE, ...defaultClientConditions],
    // The stories import the Storybook preview (CSF Factories).
    alias: [
      { find: /^#\.storybook\//, replacement: `${resolve(import.meta.dirname, ".storybook")}/` },
    ],
  },
  ssr: { resolve: { conditions: [SOURCE, ...defaultServerConditions] } },
  optimizeDeps: {
    // Pre-bundle every Lit entry point the code imports. Otherwise Vite
    // discovers one mid-run in Vitest/Storybook (e.g. lit/static-html.js),
    // re-optimizes, and already-loaded test iframes fail on a cold cache.
    // Add any new `lit/...` import here.
    include: [
      "lit",
      "lit/decorators.js",
      "lit/directives/if-defined.js",
      "lit/directives/live.js",
      "lit/directives/unsafe-html.js",
      "lit/static-html.js",
    ],
  },
});
