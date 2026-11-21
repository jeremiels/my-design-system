/**
 * ACME's design system (ADR 0006 of the base): part of the base's catalog
 * (no button-link), its form fields and its autocomplete, ACME's card, ACME's button in place of
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
  catalog: ["button", "alert", "modal", "icon", "text-field", "textarea", "autocomplete", "card"],
  overrides: {
    button: () =>
      import("./components/acme-button/acme-button.js").then((module) => module.AcmeButton),
  },
  icons: acmeIcons,
  // The texts of ACME's language, for every component that has the property.
  labels: {
    closeLabel: "Fermer",
    errorLabel: "Erreur :",
    loadingLabel: "Chargement…",
    resultsMessage: (count: number, shown: number) => {
      const results =
        count === 0 ? "Aucune suggestion" : count === 1 ? "1 suggestion" : `${count} suggestions`;
      return shown < count ? `${results}, ${shown} affichées` : results;
    },
  },
  // Names this copy of ACME when another one registers the prefix (ADR 0012 of the base).
  version: __ACME_VERSION__,
});
