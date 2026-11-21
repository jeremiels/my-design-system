// The package exports every value of its modules: a module added without its
// line in index.ts would stay out of reach of the brands.
import { expect, it } from "vitest";
import * as api from "./index.js";

const modules = import.meta.glob<Record<string, unknown>>(
  [
    "./bases/*/*.ts",
    "./components/*/*.ts",
    "./controllers/*.ts",
    "./events/*.ts",
    "./mixins/*.ts",
    "./state/*.ts",
    "!**/*.test.ts",
    "!**/*.stories.ts",
    "!**/*.type.ts",
  ],
  { eager: true },
);

it.each(Object.entries(modules))("exports the values of %s", (_path, module) => {
  const missing = Object.keys(module).filter((name) => !(name in api));
  expect(missing).toEqual([]);
});
