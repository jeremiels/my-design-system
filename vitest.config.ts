import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import viteConfig from "./vite.config.ts";

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
// Inherit vite.config.ts (plugins such as the CSS import-attributes one,
// aliases): Vitest doesn't load it on its own once vitest.config.ts exists.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["packages/*/plugins/**/*.test.ts"],
            environment: "node",
          },
        },
        {
          // Logic that needs a real DOM: the registry, the tokens' contrast,
          // the DSDS documents against the components.
          extends: true,
          test: {
            name: "browser",
            include: [
              "packages/components/src/**/*.test.ts",
              "packages/tokens/testing/**/*.test.ts",
              ".storybook/**/*.test.ts",
            ],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
          },
        },
        {
          extends: true,
          plugins: [
            // The plugin will run tests for the stories defined in your Storybook config
            // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
            storybookTest({ configDir: path.join(import.meta.dirname, ".storybook") }),
          ],
          optimizeDeps: {
            // Imported by .storybook/actions.ts. The plugin pre-bundles
            // storybook/preview-api and storybook/test, not this one: Vite
            // discovers it mid-run on a stale cache and reloads the iframes.
            include: ["storybook/actions"],
          },
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              // Current versions of the three engines. The oldest supported
              // versions are only checked statically, by `npm run compat`.
              instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
            },
            setupFiles: [".storybook/vitest.setup.ts"],
          },
        },
      ],
    },
  }),
);
