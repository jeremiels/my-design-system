import { beforeAll } from "vitest";
import preview from "./preview";

// No visual regression in the base: it is a proof of concept. The final
// version compares the stories in Chromatic.
beforeAll(preview.composed.beforeAll);
