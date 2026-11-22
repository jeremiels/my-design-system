import path from "node:path";

import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import viteConfig from "./vite.config.ts";

// Current versions of the three engines. The oldest supported versions are
// only checked statically, by `npm run compat`. `npm run coverage` keeps
// Chromium alone: @vitest/coverage-v8 measures one browser.
// A new list for each project: Vitest names the instances it is given.
const engines = () =>
  (process.env.COVERAGE
    ? (["chromium"] as const)
    : (["chromium", "firefox", "webkit"] as const)
  ).map((browser) => ({ browser }));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
// Inherit vite.config.ts (plugins such as the CSS import-attributes one,
// aliases): Vitest doesn't load it on its own once vitest.config.ts exists.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        provider: "v8",
        include: [
          "packages/*/src/**/*.ts",
          "packages/*/plugins/**/*.ts",
          "packages/tokens/testing/**/*.ts",
        ],
        exclude: ["**/*.stories.ts", "**/*.test.ts", "**/*.setup.ts", "**/*.d.ts"],
        reporter: ["text", "html"],
        reportsDirectory: "coverage",
      },
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            // The plugins, and the components' state: functions without DOM (ADR 0010).
            include: [
              "packages/*/plugins/**/*.test.ts",
              "packages/components/src/state/**/*.test.ts",
              // The documentation tools (ADR 0039): Node only.
              "packages/catalog/src/**/*.test.ts",
              "packages/cli/src/**/*.test.ts",
              "packages/mcp/src/**/*.test.ts",
            ],
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
            exclude: ["packages/components/src/state/**", "packages/components/src/ssr.test.ts"],
            setupFiles: ["packages/components/src/browser.setup.ts"],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
          },
        },
        {
          // The rendering contract (ADR 0014): the catalog rendered by Lit SSR
          // in Node (globalSetup), then hydrated in each engine.
          extends: true,
          optimizeDeps: {
            // Imported first by src/ssr.test.ts: found mid-run otherwise.
            include: ["@lit-labs/ssr-client/lit-element-hydrate-support.js"],
          },
          test: {
            name: "ssr",
            include: ["packages/components/src/ssr.test.ts"],
            globalSetup: ["packages/components/src/ssr.setup.ts"],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: engines(),
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
              instances: engines(),
            },
            setupFiles: [".storybook/vitest.setup.ts"],
          },
        },
      ],
    },
  }),
);
