/**
 * ACME's catalog and texts (ADR 0006 of the base): plain data, without any
 * import. `designSystem()` (src/design-system.ts) takes them, and so does
 * ACME's documentation (src/docs.ts), in Node.
 */

/** The components an application of ACME registers, by name. */
export const catalog: readonly string[] = [
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
];

/** The texts of ACME's language, for every component that has the property. */
export const labels: Readonly<Record<string, unknown>> = {
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
};
