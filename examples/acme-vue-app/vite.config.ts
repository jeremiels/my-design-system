import { acme } from "@acme/design-system";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      // Three pages: the account form, the list of requests, and the
      // assistant, whose agent sends its interface (A2UI).
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        requests: resolve(import.meta.dirname, "requests.html"),
        agent: resolve(import.meta.dirname, "agent.html"),
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
          // ACME tells its tags from its prefix, its A2UI adapters included
          // (acme-a2ui-*). <a2ui-surface> is the A2UI renderer's.
          isCustomElement: (tag) => acme.isCustomElement(tag) || tag.startsWith("a2ui-"),
        },
      },
    }),
  ],
});
