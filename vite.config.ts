import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      // Entry point of your design system
      entry: resolve(__dirname, "src/index.ts"),
      name: "MyDesignSystem",
      formats: ["es"],
      fileName: "my-design-system",
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
