import { acme } from "@acme/design-system";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      // Two pages: the account form, and the list of requests.
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        requests: resolve(import.meta.dirname, "requests.html"),
      },
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // ACME's components are custom elements, not Vue components: Vue
          // sets their properties, listens to their events, and compiles
          // `v-model` on <acme-text-field> as on an <input> (`value`, `input`).
          // ACME tells its tags from its prefix.
          isCustomElement: acme.isCustomElement,
        },
      },
    }),
  ],
});
