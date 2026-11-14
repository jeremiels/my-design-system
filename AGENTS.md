# Instructions pour les agents — My Design System

Ce dépôt est un **socle marque blanche** pour design systems. Il contient trois packages ([ADR 0003](docs/adr/0003-packages-tokens-et-composants.mdx), [ADR 0005](docs/adr/0005-icones.mdx)) :

- `@unicorne/tokens` : les tokens DTCG à trois niveaux, la source des thèmes du web, d'iOS et d'Android. Ils sont générés en custom properties `--u-`.
- `@unicorne/icons` : les icônes SVG, optimisées, un module par icône chargé à la demande, et leur générateur `unicorne-icons`.
- `@unicorne/components` : des composants Lit (`button`, `button-link`, `alert`, `modal`, `icon`, `text-field`, `textarea`) et l'outillage pour les étendre.

Chaque marque dépend du socle, l'étend, l'enregistre sous son préfixe et le republie ([ADR 0001](docs/adr/0001-architecture-multi-marque.mdx)). Le socle est une preuve de concept : il n'est pas publié et n'a pas de versions.

Stack : workspaces npm · Lit 3 (peer dependency, jamais embarqué) · Vite 8 · TypeScript strict avec les décorateurs historiques de Lit · Terrazzo 2 (tokens DTCG) · SVGO 4 (icônes) · Vitest, Storybook 10 et Playwright · oxlint et oxfmt · Node ≥ 26 et npm ≥ 11.12 (`.nvmrc`).

Ce fichier est un index. Les détails sont dans la documentation et dans les skills du projet (`.claude/skills/`). Chargez le skill de la tâche avant de la commencer.

## Skills

| Tâche                                                                         | Skill                     |
| ----------------------------------------------------------------------------- | ------------------------- |
| Nouveau composant, de bout en bout (fichiers, enregistrement, exports, tests) | `create-component`        |
| TypeScript d'un composant : propriétés, rendu, événements, accessibilité      | `lit-component`           |
| CSS d'un composant ou d'un mixin : tokens, variantes, parts, états            | `component-styling`       |
| Token DTCG, à tout niveau : primitive, sémantique, composant, thème, variante | `design-tokens`           |
| API publique : JSDoc, `custom-elements.json`, ruptures pour les marques       | `component-api-docs`      |
| Mixin (`packages/components/src/mixins/withX.ts`)                             | `lit-mixin`               |
| Icône SVG, du socle ou d'une marque ; icône rendue par un composant           | `icons`                   |
| Documentation : pages Storybook, `AGENTS.md`, skills                          | `storybook-documentation` |

## Documentation

Les pages sont dans `docs/` et dans Storybook. Elles suivent la [charte de rédaction](docs/reference/charte-de-redaction.mdx).

- Tutoriel : [Premiers pas](docs/premiers-pas.mdx).
- Guides : [Créer un design system de marque](docs/guides/design-system-de-marque.mdx), [Utiliser une marque dans une application Vue](docs/guides/application-vue.mdx).
- Référence : [Tokens et couches CSS](docs/reference/tokens-et-couches.mdx), [Support navigateurs](docs/reference/support-navigateurs.mdx), [Mixins](docs/reference/mixins.mdx), [Icônes](docs/reference/icones.mdx), [Charte de rédaction](docs/reference/charte-de-redaction.mdx). La JSDoc des composants est leur référence.
- Explication : [Architecture CSS](docs/explication/architecture-css.mdx).
- Décisions : [ADR 0001](docs/adr/0001-architecture-multi-marque.mdx), [ADR 0002](docs/adr/0002-tokens-dtcg.mdx) (tokens DTCG), [ADR 0003](docs/adr/0003-packages-tokens-et-composants.mdx) (packages tokens et composants), [ADR 0004](docs/adr/0004-plateformes-natives-et-figma.mdx) (iOS, Android et Figma), [ADR 0005](docs/adr/0005-icones.mdx) (icônes), [ADR 0006](docs/adr/0006-design-system-de-marque.mdx) (design system de marque), [ADR 0007](docs/adr/0007-champs-de-formulaire.mdx) (champs de formulaire).

## Emplacements

`packages/tokens/` (`@unicorne/tokens`) :

- `src/` : les sources DTCG des tokens, tokens de composant compris, et leur resolver `u.resolver.json`. Elles sont publiées.
- `css/tokens.css` : la feuille de page, générée par `terrazzo.config.ts` et commitée.
- `plugins/` : `terrazzo-plugin.ts` (Terrazzo) génère le CSS des tokens. `dtcg-sources.ts` lit le resolver et vérifie les niveaux.
- `testing/` : `contrastFailures()` (`@unicorne/tokens/testing`), le contraste d'un thème.

`packages/icons/` (`@unicorne/icons`) :

- `src/` : les sources SVG, une par icône (`<nom>.svg`). Elles ne sont pas publiées.
- `js/` et `svg/` : les icônes optimisées, générées par `npm run icons` et commitées. `js/index.js` exporte `icons`, la table des chargements.
- `plugins/` : `icon-set.ts` vérifie et optimise les sources (SVGO), `cli.ts` est la commande `unicorne-icons`.

`packages/components/` (`@unicorne/components`) :

- `src/components/<nom>/` : la classe, sa feuille `.css`, la feuille générée de ses tokens `.tokens.css`, ses types `.type.ts` et ses stories `.stories.ts`. `base-element.ts` définit `DSBaseElement` (shadow DOM, contrat d'enregistrement, `tagFor()`). `field/` contient `FieldBase`, la base des champs de formulaire, et leurs tokens.
- `src/mixins/` : `withDisabled` et `withInternals`.
- `src/events/` : une classe `Event` typée par événement (`modal-close.ts`).
- `src/registry/` : `defineComponents()`, le catalogue (`allComponents`) et `designSystem()`, la déclaration d'un design system de marque ([ADR 0006](docs/adr/0006-design-system-de-marque.mdx)). `src/define.ts` enregistre le catalogue avec le préfixe `u`. `src/index.ts` n'a aucun effet de bord.
- `src/styles/` : le CSS de la page. `main.css` devient `styles.css` (couches et utilitaires), `reset.css` devient le `reset.css` optionnel.
- `terrazzo.config.ts` : la liaison web des tokens de composant. Il associe chaque modifier à un attribut et génère les feuilles `:host`.
- `plugins/` : `css-import-attributes.ts` (Vite) compile les imports `with { type: "css" }`. `cem-plugin.ts` (analyseur) documente les tokens de composant.
- `custom-elements.json` : l'API publique, générée par `npm run analyze` et commitée.
- `src/components/*/*.dsds.yaml` : les règles d'usage des composants, au format [DSDS](https://designsystemdocspec.org) (pilote sur `button` et `button-link`). `design-system.dsds.yaml`, à la racine, les liste.

À la racine :

- `docs/` et `.storybook/` : la documentation et Storybook, pour les trois packages.
- `vite.config.ts`, `vitest.config.ts` et `index.html` : l'environnement de développement (démo, Storybook, Vitest). Chaque package a sa propre configuration de build.
- `examples/acme-design-system/` : une marque d'exemple, construite et testée contre les archives du socle.
- `examples/acme-vue-app/` : une application Vue d'exemple, un formulaire sur ACME. Elle est construite et testée contre les archives d'ACME et du socle.
- `scripts/` : `run-example.mjs` et `check-css-compat.mjs`.
- `.github/workflows/ci.yml` : la CI.

## Règles pour chaque changement

- **Enregistrement :** un composant ne s'enregistre jamais lui-même (skill `lit-component`).
- **API publique :** seul ce que la JSDoc documente est public. Après un changement d'API, lancez `npm run analyze` et relisez le diff de `custom-elements.json` (skill `component-api-docs`).
- **Styles :** une feuille `.css` voisine qui lit les tokens du composant. Les tokens sont des sources DTCG à trois niveaux dans `@unicorne/tokens`, jamais du CSS écrit à la main ([Tokens et couches CSS](docs/reference/tokens-et-couches.mdx)).
- **Packages :** un package importe l'autre par son nom (`@unicorne/tokens/…`), jamais par un chemin relatif. Ajoutez la condition `@unicorne/source` à tout nouvel export TypeScript.
- **Navigateurs :** vérifiez toute fonctionnalité récente contre la [matrice](docs/reference/support-navigateurs.mdx).
- **Accessibilité :** éléments natifs d'abord. Une violation axe fait échouer la story. Les tokens par défaut gardent un contraste AA.
- **Documentation :** appliquez la [charte de rédaction](docs/reference/charte-de-redaction.mdx).

## Commandes

À la racine du dépôt :

```sh
npm run dev | storybook          # démo Vite (index.html) | Storybook sur :6006
npm run tokens                   # sources DTCG → packages/tokens/css/tokens.css et packages/components/src/components/*/*.tokens.css
npm run icons                    # sources SVG → packages/icons/js/ et packages/icons/svg/
npm run analyze                  # manifest → packages/components/custom-elements.json
npm run build                    # les trois packages, tokens puis icônes d'abord → packages/*/dist/
npm run check                    # oxlint, oxfmt --check, tsc, tokens:check, icons:check, api:check, dsds, Vitest : ce que la CI exige
npx vitest run --project browser # un projet Vitest : unit (Node), browser (Chromium), storybook (3 moteurs)
npm run example                  # archives du socle → build et test d'ACME, puis archive d'ACME → build et test de l'app Vue
npm run dsds                     # valide et vérifie le format des documents DSDS
npm run compat                   # es-check et doiuse contre la matrice
npm run lint | fmt               # corrections automatiques
```

Un script d'un seul package se lance avec `-w` : `npm run tokens -w @unicorne/tokens`.

`tokens:check`, `icons:check` et `api:check` comparent les fichiers régénérés avec ceux de l'index git. Indexez-les (`git add`) avant de lancer `check`.

La CI tourne sur chaque push vers `master` et sur chaque pull request. Elle lance `check`, puis `example` et `compat`.
