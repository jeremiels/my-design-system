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

export const acme = designSystem({
  prefix: "acme",
  catalog: [
    "button",
    "alert",
    "modal",
    "drawer",
    "icon",
    "text-field",
    "textarea",
    "autocomplete",
    "combobox",
    "select",
    "date-picker",
    "file-field",
    "toggle-button",
    "badge",
    "tag",
    "tag-group",
    "table",
    "table-row",
    "table-cell",
    "table-header-cell",
    "pagination",
    "stepper",
    "step",
    "toaster",
    "page",
    "header",
    "footer",
    "side-nav",
    "side-nav-item",
    "notice",
    "link",
    "card",
  ],
  overrides: {
    button: () =>
      import("./components/acme-button/acme-button.js").then((module) => module.AcmeButton),
  },
  icons: acmeIcons,
  // The texts of ACME's language, for every component that has the property.
  labels: {
    closeLabel: "Fermer",
    completedLabel: "(terminée)",
    filesLabel: "Fichiers choisis",
    nextMonthLabel: "Mois suivant",
    newWindowLabel: "(nouvelle fenêtre)",
    nextPageLabel: "Page suivante",
    pageLabel: (page: number) => `Page ${page}`,
    previousMonthLabel: "Mois précédent",
    previousPageLabel: "Page précédente",
    removeMessage: (text: string) => `Retirer ${text}`,
    selectAllLabel: "Sélectionner toutes les lignes",
    selectMessage: (name: string) => `Sélectionner ${name}`,
    skipLinksLabel: "Accès rapide",
    skipToContentLabel: "Aller au contenu",
    statusMessage: (page: number, pages: number) => `Page ${page} sur ${pages}`,
    valuesLabel: "Options choisies",
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
