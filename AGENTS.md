# Instructions pour les agents — My Design System

Ce dépôt est un **socle marque blanche** pour design systems. Il contient des composants Lit (`button`, `button-link`, `alert`, `modal`), des tokens DTCG générés en custom properties `--u-`, et l'outillage pour les étendre. Chaque marque dépend du socle, l'étend, l'enregistre sous son préfixe et le republie ([ADR 0001](src/docs/adr/0001-architecture-multi-marque.mdx)). Le socle est une preuve de concept : il n'est pas publié et n'a pas de versions.

Stack : Lit 3 (peer dependency, jamais embarqué) · Vite 8 · TypeScript strict avec les décorateurs historiques de Lit · Terrazzo 2 (tokens DTCG) · Vitest, Storybook 10 et Playwright · oxlint et oxfmt · Node ≥ 26 et npm ≥ 11.12 (`.nvmrc`).

Ce fichier est un index. Les détails sont dans la documentation et dans les skills du projet (`.claude/skills/`). Chargez le skill de la tâche avant de la commencer.

## Skills

| Tâche                                                                         | Skill                     |
| ----------------------------------------------------------------------------- | ------------------------- |
| Nouveau composant, de bout en bout (fichiers, enregistrement, exports, tests) | `create-component`        |
| TypeScript d'un composant : propriétés, rendu, événements, accessibilité      | `lit-component`           |
| CSS d'un composant ou d'un mixin : tokens, variantes, parts, états            | `component-styling`       |
| Token DTCG, à tout niveau : primitive, sémantique, composant, thème, variante | `design-tokens`           |
| API publique : JSDoc, `custom-elements.json`, ruptures pour les marques       | `component-api-docs`      |
| Mixin (`src/mixins/withX.ts`)                                                 | `lit-mixin`               |
| Documentation : pages Storybook, `AGENTS.md`, skills                          | `storybook-documentation` |

## Documentation

Les pages sont dans `src/docs/` et dans Storybook. Elles suivent la [charte de rédaction](src/docs/reference/charte-de-redaction.mdx).

- Tutoriel : [Premiers pas](src/docs/premiers-pas.mdx).
- Guide : [Créer un design system de marque](src/docs/guides/design-system-de-marque.mdx).
- Référence : [Tokens et couches CSS](src/docs/reference/tokens-et-couches.mdx), [Support navigateurs](src/docs/reference/support-navigateurs.mdx), [Mixins](src/docs/reference/mixins.mdx), [Charte de rédaction](src/docs/reference/charte-de-redaction.mdx). La JSDoc des composants est leur référence.
- Explication : [Architecture CSS](src/docs/explication/architecture-css.mdx).
- Décisions : [ADR 0001](src/docs/adr/0001-architecture-multi-marque.mdx), [ADR 0002](src/docs/adr/0002-tokens-dtcg.mdx) (tokens DTCG).

## Emplacements

- `tokens/` : les sources DTCG des tokens et leur resolver `u.resolver.json`, publiés avec le package. `terrazzo.config.ts` les génère en CSS.
- `src/components/<nom>/` : la classe, sa feuille `.css`, la feuille générée de ses tokens `.tokens.css`, ses types `.type.ts` et ses stories `.stories.ts`. `base-element.ts` définit `DSBaseElement` (shadow DOM, contrat d'enregistrement, `tagFor()`).
- `src/mixins/` : `withDisabled` et `withInternals`.
- `src/events/` : une classe `Event` typée par événement (`modal-close.ts`).
- `src/registry/` : `defineComponents()` et le catalogue (`allComponents`). `src/define.ts` enregistre le catalogue avec le préfixe `u`. `src/index.ts` n'a aucun effet de bord.
- `src/testing/` : `contrastFailures()` (`my-design-system/testing`), le contraste d'un thème.
- `src/styles/` : le CSS de la page. `main.css` devient `styles.css`, `reset.css` devient le `reset.css` optionnel. `tokens.css` est généré.
- `custom-elements.json` : l'API publique, générée par `npm run analyze` et commitée.
- `design-system.dsds.yaml` et `src/components/*/*.dsds.yaml` : les règles d'usage des composants, au format [DSDS](https://designsystemdocspec.org) (pilote sur `button` et `button-link`).
- `plugins/` : les plugins exportés pour les marques. `css-import-attributes.ts` (Vite) compile les imports `with { type: "css" }`. `terrazzo-plugin.ts` (Terrazzo) génère le CSS des tokens. `cem-plugin.ts` (analyseur) documente les tokens de composant.
- `examples/acme-design-system/` : une marque d'exemple, construite et testée contre l'archive du socle.
- `.github/workflows/ci.yml` : la CI.

## Règles pour chaque changement

- **Enregistrement :** un composant ne s'enregistre jamais lui-même (skill `lit-component`).
- **API publique :** seul ce que la JSDoc documente est public. Après un changement d'API, lancez `npm run analyze` et relisez le diff de `custom-elements.json` (skill `component-api-docs`).
- **Styles :** une feuille `.css` voisine qui lit les tokens du composant. Les tokens sont des sources DTCG à trois niveaux, jamais du CSS écrit à la main ([Tokens et couches CSS](src/docs/reference/tokens-et-couches.mdx)).
- **Navigateurs :** vérifiez toute fonctionnalité récente contre la [matrice](src/docs/reference/support-navigateurs.mdx).
- **Accessibilité :** éléments natifs d'abord. Une violation axe fait échouer la story. Les tokens par défaut gardent un contraste AA.
- **Documentation :** appliquez la [charte de rédaction](src/docs/reference/charte-de-redaction.mdx).

## Commandes

```sh
npm run dev | storybook          # démo Vite (index.html) | Storybook sur :6006
npm run tokens                   # sources DTCG (tokens/) → src/styles/tokens.css et src/components/*/*.tokens.css
npm run build                    # tokens, manifest, modules ES, .d.ts, plugins → dist/
npm run check                    # oxlint, oxfmt --check, tsc, tokens:check, api:check, dsds, Vitest : ce que la CI exige
npx vitest run --project browser # un projet Vitest : unit (Node), browser (Chromium), storybook (3 moteurs)
npm run example                  # archive du socle → installation, build et test d'ACME
npm run dsds                     # valide et vérifie le format des documents DSDS
npm run compat                   # es-check et doiuse contre la matrice
npm run lint | fmt               # corrections automatiques
```

`tokens:check` et `api:check` comparent les fichiers régénérés avec ceux de l'index git. Indexez-les (`git add`) avant de lancer `check`.

La CI tourne sur chaque push vers `master` et sur chaque pull request. Elle lance `check`, puis `example` et `compat`.
