# Instructions pour les agents — My Design System

Ce dépôt est un **socle marque blanche** pour design systems. Il contient trois packages ([ADR 0003](docs/adr/0003-packages-tokens-et-composants.mdx), [ADR 0005](docs/adr/0005-icones.mdx)) :

- `@unicorne/tokens` : les tokens DTCG à trois niveaux, la source des thèmes du web, d'iOS et d'Android. Ils sont générés en custom properties `--u-`.
- `@unicorne/icons` : les icônes SVG, optimisées, un module par icône chargé à la demande, et leur générateur `unicorne-icons`.
- `@unicorne/components` : des composants Lit (`button`, `button-link`, `alert`, `modal`, `icon`, `text-field`, `textarea`, `autocomplete`, `combobox`, `checkbox`, `switch`, `radio-group`, `radio`, `checkbox-group`, `select`, `number-field`, `date-field`, `slider`, `tabs`, `tab`, `tab-panel`, `details`, `breadcrumb`, `breadcrumb-item`, `pagination`, `toolbar`, `menu`, `menu-item`, `drawer`, `popover`, `tooltip`, `toaster`, `calendar`, `date-picker`, `tree`, `tree-item`, `spinner`, `progress`, `badge`, `tag`, `tag-group`, `file-field`, `stepper`, `step`, `table`), leurs mixins, leurs contrôleurs, leurs fonctions d'état et l'outillage pour les étendre.

Chaque marque dépend du socle, l'étend, l'enregistre sous son préfixe et le republie ([ADR 0001](docs/adr/0001-architecture-multi-marque.mdx)). Le socle est une preuve de concept : il n'est pas publié et n'a pas de versions.

Stack : workspaces npm · Lit 3 (peer dependency, jamais embarqué) · Vite 8 · TypeScript strict avec les décorateurs historiques de Lit · Terrazzo 2 (tokens DTCG) · SVGO 4 (icônes) · Floating UI 1 (repli de CSS anchor positioning, chargé à la demande) · Vitest, Storybook 10 et Playwright · oxlint et oxfmt · Node ≥ 26 et npm ≥ 11.12 (`.nvmrc`).

Ce fichier est un index. Les détails sont dans la documentation et dans les skills du projet (`.claude/skills/`). Chargez le skill de la tâche avant de la commencer.

## Skills

| Tâche                                                                          | Skill                     |
| ------------------------------------------------------------------------------ | ------------------------- |
| Nouveau composant, de bout en bout (fichiers, enregistrement, exports, tests)  | `create-component`        |
| TypeScript d'un composant : propriétés, rendu, événements, accessibilité       | `lit-component`           |
| CSS d'un composant ou d'un mixin : tokens, variantes, parts, états             | `component-styling`       |
| Token DTCG, à tout niveau : primitive, sémantique, composant, thème, variante  | `design-tokens`           |
| API publique : JSDoc, `custom-elements.json`, ruptures pour les marques        | `component-api-docs`      |
| Mixin, contrôleur ou fonction d'état (`src/mixins/`, `controllers/`, `state/`) | `lit-mixin`               |
| Icône SVG, du socle ou d'une marque ; icône rendue par un composant            | `icons`                   |
| Documentation : pages Storybook, `AGENTS.md`, skills                           | `storybook-documentation` |

## Documentation

Les pages sont dans `docs/` et dans Storybook. Elles suivent la [charte de rédaction](docs/reference/charte-de-redaction.mdx).

- Tutoriel : [Premiers pas](docs/premiers-pas.mdx).
- Guides : [Créer un design system de marque](docs/guides/design-system-de-marque.mdx), [Utiliser une marque dans une application Vue](docs/guides/application-vue.mdx), [Rendre une marque sur un serveur](docs/guides/rendu-serveur.mdx), [Ouvrir et fermer une modale](docs/guides/modale.mdx).
- Référence : [API des composants](docs/reference/api-des-composants.mdx), [Tokens et couches CSS](docs/reference/tokens-et-couches.mdx), [Support navigateurs](docs/reference/support-navigateurs.mdx), [Mixins](docs/reference/mixins.mdx), [Contrôleurs et état](docs/reference/controleurs.mdx), [Icônes](docs/reference/icones.mdx), [Charte de rédaction](docs/reference/charte-de-redaction.mdx). La JSDoc des composants est leur référence.
- Explication : [Architecture CSS](docs/explication/architecture-css.mdx).
- Décisions : [ADR 0001](docs/adr/0001-architecture-multi-marque.mdx), [ADR 0002](docs/adr/0002-tokens-dtcg.mdx) (tokens DTCG), [ADR 0003](docs/adr/0003-packages-tokens-et-composants.mdx) (packages tokens et composants), [ADR 0004](docs/adr/0004-plateformes-natives-et-figma.mdx) (iOS, Android et Figma), [ADR 0005](docs/adr/0005-icones.mdx) (icônes), [ADR 0006](docs/adr/0006-design-system-de-marque.mdx) (design system de marque), [ADR 0007](docs/adr/0007-champs-de-formulaire.mdx) (champs de formulaire), [ADR 0008](docs/adr/0008-commandes.mdx) (commandes et modale), [ADR 0009](docs/adr/0009-autocomplete-combobox-et-popovers.mdx) (autocomplete, combobox et popovers ancrés), [ADR 0010](docs/adr/0010-etat-controleurs-et-mixins.mdx) (état, contrôleurs et mixins), [ADR 0012](docs/adr/0012-coexistence-des-enregistrements.mdx) (coexistence des enregistrements), [ADR 0013](docs/adr/0013-portees-de-marque-et-de-theme.mdx) (portées de marque et de thème), [ADR 0014](docs/adr/0014-vue-et-rendu-serveur.mdx) (Vue et rendu serveur), [ADR 0016](docs/adr/0016-api-partagee-code-et-figma.mdx) (API partagée entre le code et Figma, proposé), [ADR 0017](docs/adr/0017-cases-interrupteurs-et-radios.mdx) (cases à cocher, interrupteurs et radios), [ADR 0018](docs/adr/0018-select.mdx) (select), [ADR 0019](docs/adr/0019-nombres-dates-et-curseurs.mdx) (nombres, dates et curseurs), [ADR 0020](docs/adr/0020-onglets-details-et-navigation.mdx) (onglets, détails et navigation), [ADR 0021](docs/adr/0021-menu-et-popups.mdx) (menu et popups), [ADR 0022](docs/adr/0022-tiroir-popover-infobulle-et-toasts.mdx) (tiroir, popover, infobulle et toasts), [ADR 0023](docs/adr/0023-calendrier-et-date-picker.mdx) (calendrier et date picker), [ADR 0024](docs/adr/0024-arbre-et-debordement.mdx) (arbre et débordement), [ADR 0025](docs/adr/0025-combobox-a-valeur-imposee.mdx) (combobox à valeur imposée), [ADR 0026](docs/adr/0026-grandes-listes-et-options-chargees.mdx) (grandes listes et options chargées), [ADR 0027](docs/adr/0027-indicateurs-et-tags.mdx) (indicateurs et tags), [ADR 0028](docs/adr/0028-champ-de-fichiers.mdx) (champ de fichiers), [ADR 0029](docs/adr/0029-etapes.mdx) (étapes), [ADR 0030](docs/adr/0030-tableau.mdx) (tableau).
- Décisions reportées à la version finale du socle : [ADR 0011](docs/adr/0011-matrice-navigateurs.mdx) (révision de la matrice, tests sur ses planchers), [ADR 0015](docs/adr/0015-versions-et-contrat-api.mdx) (Changesets, porte de rupture, dépréciation).
- Revue d'architecture du 16 novembre 2026 : [rapport](docs/revue-architecture/rapport.md) et [plan de migration](docs/revue-architecture/plan-de-migration.md).

## Emplacements

`packages/tokens/` (`@unicorne/tokens`) :

- `src/` : les sources DTCG des tokens, tokens de composant compris, et leur resolver `u.resolver.json`. Elles sont publiées.
- `css/tokens.css` : la feuille de page, générée par `terrazzo.config.ts` et commitée.
- `plugins/` : `terrazzo-plugin.ts` (Terrazzo) génère le CSS des tokens. `dtcg-sources.ts` lit le resolver, vérifie les niveaux et écrit le resolver d'une marque (`brandResolver()`).
- `testing/` : `contrastFailures()` (`@unicorne/tokens/testing`), le contraste d'un thème.

`packages/icons/` (`@unicorne/icons`) :

- `src/` : les sources SVG, une par icône (`<nom>.svg`). Elles ne sont pas publiées.
- `js/` et `svg/` : les icônes optimisées, générées par `npm run icons` et commitées. `js/index.js` exporte `icons`, la table des chargements.
- `plugins/` : `icon-set.ts` vérifie et optimise les sources (SVGO), `cli.ts` est la commande `unicorne-icons`.

`packages/components/` (`@unicorne/components`) :

- `src/components/<nom>/` : les composants exposés, un dossier chacun : la classe, sa feuille `.css`, la feuille générée de ses tokens `.tokens.css`, ses types `.type.ts`, ses stories `.stories.ts` et ses tests.
- `src/bases/` : les classes de base, qu'aucune balise n'enregistre. `base-element.ts` définit `DSBaseElement` (shadow DOM, contrat d'enregistrement, `tagFor()`). Un dossier par famille, avec ses feuilles et ses tokens : `button/` (`ButtonBase`, de `button` et `button-link`), `field/` (`FieldBase`, des champs), `combobox/` (`ComboboxBase`, des champs à popup), `editable-combobox/` (`EditableComboboxBase`, d'`autocomplete` et `combobox`), `picker/` (`PickerBase`, de `select` et `date-picker`), `toggle/` (`ToggleBase`, de `checkbox` et `switch`), `choice-group/` (`ChoiceGroupBase`, des groupes de choix), `range-field/` (`RangeFieldBase`, des champs bornés), `popup/` (`PopupBase`, des popups ancrés à un déclencheur), `modal/` (`ModalBase`, de `modal` et `drawer`).
- `src/state/` : l'état des composants composites, en fonctions pures sans DOM ni Lit (`collection.ts`, `combobox.ts`, `typeahead.ts`, `pagination.ts`, `toast.ts`, `selection.ts`, `calendar.ts`, `tree.ts`, `table.ts`), testées dans Node ([ADR 0010](docs/adr/0010-etat-controleurs-et-mixins.mdx)).
- `src/controllers/` : les reactive controllers, qui relient l'état au DOM, avec leurs feuilles et leurs tokens : `CommandsController` (recevoir une commande), `AnchoredPopoverController` (popover ancré sous un élément), `ListboxController` (liste d'options, ses tokens et le type `ListboxOption`), `DismissController` (fermer un popup, et dire pourquoi), `AnnounceController` (live region), `RovingFocusController` (tabindex mobile), `HoverIntentController` (survol et focus d'un déclencheur), `OverflowController` (contenu qui dépasse un conteneur), `LoadController` (un chargement à la fois, avec délai et annulation). `exit-transition.ts` anime la sortie du top layer.
- `src/mixins/` : les comportements qui ont une API publique : `withDisabled`, `withInternals`, `withFormControl` (contrôle de formulaire) et `withInvoker` (envoyer une commande).
- `src/polyfills/` : `invokers.ts` charge `invokers-polyfill` à la demande, là où Invoker Commands manquent ([ADR 0008](docs/adr/0008-commandes.mdx)). `anchor-positioning.ts` charge Floating UI, là où CSS anchor positioning manque ([ADR 0009](docs/adr/0009-autocomplete-combobox-et-popovers.mdx)).
- `src/events/` : une classe `Event` typée par événement (`modal-cancel.ts`, `modal-close.ts`, `listbox-select.ts`, `popup-toggle.ts`, `toast-close.ts`, `tag-remove.ts`, `table-sort.ts`).
- `src/registry/` : `defineComponents()`, le catalogue (`allComponents`, et ses types `Catalog` et `TagNameMap`) et `designSystem()`, la déclaration d'un design system de marque ([ADR 0006](docs/adr/0006-design-system-de-marque.mdx)).
- `src/vue.ts` : les types des balises pour les templates Vue, dans l'entrée `./vue` ([ADR 0014](docs/adr/0014-vue-et-rendu-serveur.mdx)).
- `src/ssr.setup.ts` et `src/ssr.test.ts` : le contrat de rendu serveur. Le catalogue est rendu par Lit SSR dans Node, puis hydraté dans trois moteurs. `src/define.ts` enregistre le catalogue avec le préfixe `u`. `src/index.ts` n'a aucun effet de bord.
- `src/styles/` : le CSS de la page. `main.css` devient `styles.css` (couches et utilitaires), `reset.css` devient le `reset.css` optionnel.
- `terrazzo.config.ts` : la liaison web des tokens de composant. Il associe chaque modifier à un attribut et génère les feuilles `:host`.
- `plugins/` : `css-import-attributes.ts` (Vite) compile les imports `with { type: "css" }`. `cem-plugin.ts` (analyseur) documente les tokens de composant.
- `custom-elements.json` : l'API publique, générée par `npm run analyze` et commitée.
- `src/components/*/*.dsds.yaml` : les règles d'usage des composants, au format [DSDS](https://designsystemdocspec.org) (pilote sur `button` et `button-link`). `design-system.dsds.yaml`, à la racine, les liste.

À la racine :

- `docs/` et `.storybook/` : la documentation et Storybook, pour les trois packages.
- `vite.config.ts`, `vitest.config.ts` et `index.html` : l'environnement de développement (démo, Storybook, Vitest). Chaque package a sa propre configuration de build.
- `examples/acme-design-system/` : une marque d'exemple, construite et testée contre les archives du socle.
- `examples/acme-vue-app/` : une application Vue d'exemple, un formulaire sur ACME avec un autocomplete. Elle est construite et testée contre les archives d'ACME et du socle.
- `scripts/` : `run-example.mjs`, `check-css-compat.mjs` et `pack-manifest.mjs` (retire la condition `@unicorne/source` des archives, au `prepack`).
- `.github/workflows/ci.yml` : la CI.

## Règles pour chaque changement

- **Enregistrement :** un composant ne s'enregistre jamais lui-même (skill `lit-component`).
- **API publique :** seul ce que la JSDoc documente est public. Ses noms suivent [API des composants](docs/reference/api-des-composants.mdx). Après un changement d'API, lancez `npm run analyze` et relisez le diff de `custom-elements.json` (skill `component-api-docs`).
- **Styles :** une feuille `.css` voisine qui lit les tokens du composant. Les tokens sont des sources DTCG à trois niveaux dans `@unicorne/tokens`, jamais du CSS écrit à la main ([Tokens et couches CSS](docs/reference/tokens-et-couches.mdx)).
- **Packages :** un package importe l'autre par son nom (`@unicorne/tokens/…`), jamais par un chemin relatif. Ajoutez la condition `@unicorne/source` à tout nouvel export TypeScript : `prepack` la retire de l'archive.
- **Navigateurs :** vérifiez toute fonctionnalité récente contre la [matrice](docs/reference/support-navigateurs.mdx).
- **Rendu serveur :** un module s'importe sans DOM, et le premier rendu d'un composant dépend de ses propriétés seulement (skill `lit-component`).
- **Thèmes :** une marque vise `[data-brand="<marque>"]`, et un thème s'applique à toute zone `[data-theme]` ([Tokens et couches CSS](docs/reference/tokens-et-couches.mdx)).
- **Accessibilité :** éléments natifs d'abord. Une violation axe fait échouer la story. Les tokens par défaut gardent un contraste AA.
- **Documentation :** appliquez la [charte de rédaction](docs/reference/charte-de-redaction.mdx).

## Commandes

À la racine du dépôt :

```sh
npm run dev | storybook          # démo Vite (index.html) | Storybook sur :6006
npm run tokens                   # sources DTCG → packages/tokens/css/tokens.css et les *.tokens.css de packages/components/src
npm run icons                    # sources SVG → packages/icons/js/ et packages/icons/svg/
npm run analyze                  # manifest → packages/components/custom-elements.json
npm run build                    # les trois packages, tokens puis icônes d'abord → packages/*/dist/
npm run check                    # oxlint, oxfmt --check, tsc, tokens:check, icons:check, api:check, dsds, Vitest : ce que la CI exige
npx vitest run --project browser # un projet Vitest : unit (Node), browser (Chromium), ssr et storybook (3 moteurs)
npm run coverage                 # la couverture des tests, mesurée dans Chromium → coverage/
npm run example                  # archives du socle → build et test d'ACME, puis archive d'ACME → build et test de l'app Vue
npm run dsds                     # valide et vérifie le format des documents DSDS
npm run compat                   # es-check et doiuse contre la matrice
npm run lint | fmt               # corrections automatiques
```

Un script d'un seul package se lance avec `-w` : `npm run tokens -w @unicorne/tokens`.

`tokens:check`, `icons:check` et `api:check` comparent les fichiers régénérés avec ceux de l'index git. Indexez-les (`git add`) avant de lancer `check`.

La CI tourne sur chaque push vers `master` et sur chaque pull request. Elle lance `check`, puis `example` et `compat`.
