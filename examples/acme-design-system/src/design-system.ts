/**
 * ACME's design system (ADR 0006 of the base): part of the base's catalog
 * (no button-link), its form fields, its lists and its drawer, ACME's card, ACME's button in place of
 * the base's, and ACME's icons over the base's. Declaring it registers nothing and imports
 * no component: an app registers what it uses, `await acme.define(Alert)`,
 * and downloads only that — ACME's button loads with the first component
 * that renders a button.
 */
import { designSystem } from "@unicorne/components";
// Generated from icons/*.svg by `unicorne-icons`, before the build.
import { acmeIcons } from "./icons/index.js";
// The catalog and the texts, plain data: ACME's documentation tools read them too.
import { catalog, labels } from "./brand.js";

export const acme = designSystem({
  prefix: "acme",
  catalog,
  overrides: {
    button: () =>
      import("./components/acme-button/acme-button.js").then((module) => module.AcmeButton),
  },
  icons: acmeIcons,
  labels,
  // Names this copy of ACME when another one registers the prefix (ADR 0012 of the base).
  version: __ACME_VERSION__,
});
