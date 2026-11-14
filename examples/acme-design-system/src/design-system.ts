/**
 * ACME's design system (ADR 0006 of the base): part of the base's catalog
 * (no button-link), its form fields, ACME's card, ACME's button in place of
 * the base's, and ACME's icons over the base's. Declaring it registers nothing and imports
 * no component: an app registers what it uses, `await acme.define(Alert)`,
 * and downloads only that — ACME's button loads with the first component
 * that renders a button.
 */
import { designSystem } from "@unicorne/components";
// Generated from icons/*.svg by `unicorne-icons`, before the build.
import { acmeIcons } from "./icons/index.js";

export const acme = designSystem({
  prefix: "acme",
  catalog: ["button", "alert", "modal", "icon", "text-field", "textarea", "card"],
  overrides: {
    button: () =>
      import("./components/acme-button/acme-button.js").then((module) => module.AcmeButton),
  },
  icons: acmeIcons,
});
