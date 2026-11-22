---
name: create-component
description: Créer un composant du socle de bout en bout — fichiers, classe, styles, JSDoc, enregistrement, exports du package, stories, tests de contrat, vérifications — ou un composant propre à une marque. À charger pour ajouter ou créer un composant. Ce skill enchaîne lit-component, component-styling, component-api-docs et storybook-documentation.
---

# Créer un composant

Un composant touche une douzaine d'endroits, dans les deux packages du socle. Un oubli échoue souvent sans bruit : le composant marche dans Storybook, mais n'est pas publié ou pas enregistré par les marques. Suivez chaque étape.

Les chemins partent de `packages/components/`, sauf ceux de `packages/tokens/` et de la racine.

## 0. Socle ou marque ?

- Un composant utile à toutes les marques va dans le socle (`src/components/`).
- Un composant propre à une marque va dans son design system (voir « Composant de marque » plus bas).
- Choisissez le nom du composant, sans préfixe : `card`, `button-link`. Sa balise est `u-<nom>` par défaut, `acme-<nom>` pour ACME.

## 1. Créez les fichiers dans `src/components/<nom>/`

- `<nom>.ts` : la classe (skill `lit-component`). Elle étend `DSBaseElement`, déclare `static override componentName = "<nom>"` et, si elle rend d'autres composants, `static dependencies` avec `tagFor()`. Elle rend un composant de base (`button`, `icon`, `spinner`, `checkbox`) pour tout contrôle qui en a l'air, jamais son élément natif (ADR 0031).
- `packages/tokens/src/component/<nom>/<nom>.tokens.json` : ses tokens, en DTCG (skill `design-tokens`). Ils vivent dans `@unicorne/tokens`, pour toutes les plateformes. `npm run tokens` génère `src/components/<nom>/<nom>.tokens.css`.
- `<nom>.css` : sa feuille (skill `component-styling`). Elle lit les tokens `--u-<nom>-<propriété-css>`. Ajoutez `part="…"` sur les éléments que les marques peuvent styler.
- `<nom>.type.ts` : ses types union, s'il en a.
- `<nom>.stories.ts` : voir l'étape 4.
- `<nom>.dsds.yaml` : ses règles d'usage, au format DSDS (skill `storybook-documentation`, section 3). Ajoutez-le aux `refs` de `design-system.dsds.yaml`. Un sous-composant a le sien.
- La JSDoc de la classe : `@element u-<nom>`, `@summary`, slots, parts, `@tokens <nom>`, événements (skill `component-api-docs`).
- Un nouvel événement : sa classe dans `src/events/<nom>-<événement>.ts`, nommée `u-<événement>`.

## 2. Enregistrez et publiez

1. Ajoutez la classe à `allComponents` dans `src/registry/catalog.ts`. Les marques la reçoivent par `defineComponents({ components: [...allComponents, …] })`.
2. Ajoutez le composant au type `Catalog` de `src/registry/catalog.ts` : son élément et ses événements. `HTMLElementTagNameMap` et les types pour Vue en dérivent.
3. Exportez la classe, ses événements et ses types depuis `src/index.ts`.
4. Ajoutez une entrée `lib.entry` dans `vite.config.ts` : `"<nom>": resolve(import.meta.dirname, "src/components/<nom>/<nom>.ts")`.
5. Ajoutez `"./<nom>"` aux `exports` de `packages/components/package.json`, avec `types` (`./dist/components/<nom>/<nom>.d.ts`) et `import` (`./dist/<nom>.js`).
6. Ajoutez tout nouvel import `lit/...` à `optimizeDeps.include` dans le `vite.config.ts` de la racine.
7. Ajoutez une page du composant à `src/ssr.setup.ts` : le test de rendu serveur échoue sans elle.

## 3. Générez les tokens et le manifest

Lancez `npm run tokens`, puis `npm run analyze`. Relisez le diff de `custom-elements.json`. Les tests n'ont rien à ajouter : `src/api-contract.test.ts` et le test du registre déduisent leurs listes de `allComponents`.

## 4. Écrivez les stories

Écrivez `<nom>.stories.ts` à côté de la classe, sur le modèle de `button.stories.ts` :

- `component: "u-<nom>"` : les autodocs et les controls viennent du manifest.
- Le panneau Actions affiche les événements `@fires` du composant de la story (`.storybook/actions.ts`). N'écrivez aucun écouteur pour lui.
- Une story par état utile.
- Des fonctions `play` qui vérifient le comportement et le rendu : feuilles adoptées, rôles, événements. Elles tournent dans Chromium, Firefox et WebKit.

La preview (`.storybook/preview.ts`, à la racine) enregistre déjà le catalogue (`src/define.ts`). Une page MDX suit le skill `storybook-documentation`.

## 5. Vérifiez

```sh
npm run tokens && npm run analyze && git add packages   # tokens:check et api:check comparent avec l'index
npm run check                         # lint, format, tsc, tokens:check, api:check, Vitest (stories dans 3 moteurs)
npm run compat                        # syntaxe et fonctionnalités contre la matrice
npm run example                       # archives du socle → build et test d'ACME
npx publint packages/components && npx @arethetypeswrong/cli --pack packages/components --profile esm-only   # si les exports changent
```

Commitez ensuite les tokens générés et le manifest avec le code.

## Composant de marque

Dans le design system de la marque (par exemple `examples/acme-design-system`) :

- Appliquez les mêmes règles de classe, avec les imports du package du socle : `import { DSBaseElement, Button } from "@unicorne/components"`. Les dépendances vers les composants du socle donnent les surcharges de la marque.
- Écrivez ses tokens dans les sources DTCG de la marque (`tokens/component/<nom>/`), en alias de tokens sémantiques. L'option `prefix` du plugin leur donne le préfixe de la marque (`--acme-card-padding`).
- Ajoutez son nom au `catalog` de `designSystem()` (`src/design-system.ts`), sa classe à `acme.define(…)` dans `src/define.ts`, et son entrée au type `AcmeCatalog` (`src/catalog.ts`). Exportez-le depuis `src/index.ts`.
- Pour étendre un composant du socle, créez une sous-classe (`class AcmeButton extends Button`, `static styles = [Button.styles ?? [], acmeButtonTokens, acmeButtonStyles]`). Passez-la dans `overrides` de `designSystem()`, par un `import()` : `button: () => import("…").then((module) => module.AcmeButton)`. Ses valeurs de tokens viennent des sources DTCG de la marque.
- Publiez une surcharge chargée par `import()` dans sa propre entrée, jamais en valeur depuis `src/index.ts`.

Le guide complet est `docs/guides/design-system-de-marque.mdx`.
