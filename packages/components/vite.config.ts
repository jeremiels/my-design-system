import { defineConfig, defaultServerConditions } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { cssImportAttributes } from "./plugins/css-import-attributes.ts";

// Supported browsers live in the root package.json "browserslist" (see
// docs/reference/support-navigateurs.mdx); JS and CSS are lowered to them.
const browserTargets = browserslistToEsbuild();

// The version a registration carries (src/version.ts, ADR 0012).
const { version } = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  // `import sheet from "./x.css" with { type: "css" }` in components/mixins.
  plugins: [cssImportAttributes()],
  define: { __UNICORNE_VERSION__: JSON.stringify(version) },
  // `tz build` loads terrazzo.config.ts through Vite: it imports
  // @unicorne/tokens/terrazzo-plugin from its TypeScript sources, without
  // building @unicorne/tokens first (ADR 0003).
  ssr: { resolve: { conditions: ["@unicorne/source", ...defaultServerConditions] } },
  build: {
    target: browserTargets,
    // Also applies to component CSS (`?inline`), lowered by Lightning CSS.
    cssTarget: browserTargets,
    // Lib mode defaults this to false (one merged CSS file); we need it on
    // so the standalone CSS entries ("styles", "reset") are emitted on their own.
    cssCodeSplit: true,
    lib: {
      // One entry per public module, so consumers can import just what they
      // need (e.g. "@unicorne/components/button") and bundlers can tree-shake
      // the rest. Shared code (base classes, mixins) is split into common
      // chunks automatically by Rollup.
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        // Side effect: registers the catalog under the default `u-` prefix.
        define: resolve(import.meta.dirname, "src/define.ts"),
        // The cascade layers and the utilities: nothing that styles the host
        // page. The token values are @unicorne/tokens/tokens.css. The reset
        // is a separate, opt-in sheet.
        styles: resolve(import.meta.dirname, "src/styles/main.css"),
        reset: resolve(import.meta.dirname, "src/styles/reset.css"),
        button: resolve(import.meta.dirname, "src/components/button/button.ts"),
        "button-link": resolve(import.meta.dirname, "src/components/button-link/button-link.ts"),
        alert: resolve(import.meta.dirname, "src/components/alert/alert.ts"),
        modal: resolve(import.meta.dirname, "src/components/modal/modal.ts"),
        icon: resolve(import.meta.dirname, "src/components/icon/icon.ts"),
        "text-field": resolve(import.meta.dirname, "src/components/text-field/text-field.ts"),
        textarea: resolve(import.meta.dirname, "src/components/textarea/textarea.ts"),
        autocomplete: resolve(import.meta.dirname, "src/components/autocomplete/autocomplete.ts"),
        checkbox: resolve(import.meta.dirname, "src/components/checkbox/checkbox.ts"),
        switch: resolve(import.meta.dirname, "src/components/switch/switch.ts"),
        radio: resolve(import.meta.dirname, "src/components/radio/radio.ts"),
        "radio-group": resolve(import.meta.dirname, "src/components/radio-group/radio-group.ts"),
        "checkbox-group": resolve(
          import.meta.dirname,
          "src/components/checkbox-group/checkbox-group.ts",
        ),
        select: resolve(import.meta.dirname, "src/components/select/select.ts"),
        "number-field": resolve(import.meta.dirname, "src/components/number-field/number-field.ts"),
        "date-field": resolve(import.meta.dirname, "src/components/date-field/date-field.ts"),
        slider: resolve(import.meta.dirname, "src/components/slider/slider.ts"),
        tab: resolve(import.meta.dirname, "src/components/tab/tab.ts"),
        "tab-panel": resolve(import.meta.dirname, "src/components/tab-panel/tab-panel.ts"),
        tabs: resolve(import.meta.dirname, "src/components/tabs/tabs.ts"),
        details: resolve(import.meta.dirname, "src/components/details/details.ts"),
        breadcrumb: resolve(import.meta.dirname, "src/components/breadcrumb/breadcrumb.ts"),
        "breadcrumb-item": resolve(
          import.meta.dirname,
          "src/components/breadcrumb-item/breadcrumb-item.ts",
        ),
        pagination: resolve(import.meta.dirname, "src/components/pagination/pagination.ts"),
        toolbar: resolve(import.meta.dirname, "src/components/toolbar/toolbar.ts"),
        menu: resolve(import.meta.dirname, "src/components/menu/menu.ts"),
        drawer: resolve(import.meta.dirname, "src/components/drawer/drawer.ts"),
        popover: resolve(import.meta.dirname, "src/components/popover/popover.ts"),
        tooltip: resolve(import.meta.dirname, "src/components/tooltip/tooltip.ts"),
        toaster: resolve(import.meta.dirname, "src/components/toaster/toaster.ts"),
        calendar: resolve(import.meta.dirname, "src/components/calendar/calendar.ts"),
        "date-picker": resolve(import.meta.dirname, "src/components/date-picker/date-picker.ts"),
        "menu-item": resolve(import.meta.dirname, "src/components/menu-item/menu-item.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Don't bundle Lit nor the other packages of the base: the application
      // installs one copy of each. Its bundler splits @unicorne/icons into one
      // chunk per icon, loaded when the icon renders (ADR 0005), and
      // invokers-polyfill into a chunk loaded only where Invoker Commands
      // are missing (ADR 0008), and @floating-ui/dom into one loaded only
      // where CSS anchor positioning is missing (ADR 0009).
      external: [/^lit/, /^@unicorne\//, /^invokers-polyfill/, /^@floating-ui\//],
    },
  },
});
