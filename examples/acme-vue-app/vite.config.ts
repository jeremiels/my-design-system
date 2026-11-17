import { acme } from "@acme/design-system";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
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
