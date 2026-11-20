import { afterEach, beforeAll } from "vitest";
import { page, server } from "vitest/browser";
import preview from "./preview";

beforeAll(preview.composed.beforeAll);

// Visual regression: each story, once rendered and played, matches its
// reference screenshot, in `__screenshots__/` next to its stories. Chromium
// on Linux only, the engine and system of the CI: the references would
// differ in another engine, or with another system's fonts. Update them
// with `npm run screenshots`, then review the images before committing.
afterEach(async ({ expect, task }) => {
  if (
    server.browser !== "chromium" ||
    server.platform !== "linux" ||
    task.result?.state === "fail"
  ) {
    return;
  }
  await expect(page).toMatchScreenshot({
    comparatorName: "pixelmatch",
    // Text antialiasing varies a little from one machine to another.
    comparatorOptions: { threshold: 0.2, allowedMismatchedPixelRatio: 0.002 },
  });
});
