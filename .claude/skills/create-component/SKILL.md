---
name: create-component
description: Créer un composant du socle de bout en bout — fichiers, classe, styles, JSDoc, enregistrement, exports du package, stories, tests de contrat, vérifications — ou un composant propre à une marque. À charger pour ajouter ou créer un composant. Ce skill enchaîne lit-component, component-styling, component-api-docs et storybook-documentation.
---

# Créer un composant

Un composant touche une douzaine d'endroits. Un oubli échoue souvent sans bruit : le composant marche dans Storybook, mais n'est pas publié ou pas enregistré par les marques. Suivez chaque étape.

## 0. Socle ou marque ?

- Un composant utile à toutes les marques va dans le socle (`src/components/`).
- Un composant propre à une marque va dans son design system (voir « Composant de marque » plus bas).
- Choisissez le nom du composant, sans préfixe : `card`, `button-link`. Sa balise est `u-<nom>` par défaut, `acme-<nom>` pour ACME.

## 1. Créez les fichiers dans `src/components/<nom>/`

- `<nom>.ts` : la classe (skill `lit-component`). Elle étend `DSBaseElement`, déclare `static override componentName = "<nom>"` et, si elle rend d'autres composants, `static dependencies` avec `tagFor()`.
- `<nom>.css` : sa feuille (skill `component-styling`). Tokens `--u-<nom>-<propriété-css>` sur `:host`, et `part="…"` sur les éléments que les marques peuvent styler.
- `<nom>.type.ts` : ses types union, s'il en a.
- `<nom>.stories.ts` : voir l'étape 4.
- La JSDoc de la classe : `@element u-<nom>`, `@summary`, slots, parts, tokens de `:host`, événements (skill `component-api-docs`).
- Un nouvel événement : sa classe dans `src/events/<nom>-<événement>.ts`, nommée `u-<événement>`.

## 2. Enregistrez et publiez

1. Ajoutez la classe à `allComponents` dans `src/registry/catalog.ts`. Les marques la reçoivent par `defineComponents({ components: [...allComponents, …] })`.
2. Ajoutez `"u-<nom>": <Classe>` à `HTMLElementTagNameMap` dans `src/define.ts`.
3. Exportez la classe, ses événements et ses types depuis `src/index.ts`.
4. Ajoutez une entrée `lib.entry` dans `vite.config.ts` : `"<nom>": resolve(import.meta.dirname, "src/components/<nom>/<nom>.ts")`.
5. Ajoutez `"./<nom>"` aux `exports` de `package.json`, avec `types` (`./dist/components/<nom>/<nom>.d.ts`) et `import` (`./dist/<nom>.js`).
6. Ajoutez tout nouvel import `lit/...` à `optimizeDeps.include` dans `vite.config.ts`.

## 3. Générez le manifest

Lancez `npm run analyze`, puis relisez le diff de `custom-elements.json`. Les tests n'ont rien à ajouter : `src/api-contract.test.ts` et le test du registre déduisent leurs listes de `allComponents`.

## 4. Écrivez les stories

Écrivez `<nom>.stories.ts` à côté de la classe, sur le modèle de `button.stories.ts` :

- `component: "u-<nom>"` : les autodocs et les controls viennent du manifest.
- Une story par état utile.
- Des fonctions `play` qui vérifient le comportement et le rendu : feuilles adoptées, rôles, événements. Elles tournent dans Chromium, Firefox et WebKit.

La preview enregistre déjà le catalogue (`src/define.ts`). Une page MDX suit le skill `storybook-documentation`.

## 5. Vérifiez

```sh
npm run analyze && git add custom-elements.json   # api:check compare avec le manifest indexé
npm run check                         # lint, format, tsc, api:check, Vitest (stories dans 3 moteurs)
npm run compat                        # syntaxe et fonctionnalités contre la matrice
npm run example                       # archive du socle → build et test d'ACME
npx publint && npx @arethetypeswrong/cli --pack . --profile esm-only   # si les exports changent
```

Commitez ensuite le manifest avec le code.

## Composant de marque

Dans le design system de la marque (par exemple `examples/acme-design-system`) :

- Appliquez les mêmes règles de classe, avec les imports du package du socle : `import { DSBaseElement, Button } from "my-design-system"`. Les dépendances vers les composants du socle donnent les surcharges de la marque.
- Préfixez les tokens avec le nom de la marque (`--acme-card-padding`). Leur valeur par défaut est un token du socle (`var(--u-spacing-lg)`).
- Ajoutez le composant à `defineComponents({ components: [...allComponents, AcmeCard] })`, à `HTMLElementTagNameMap` et à `src/index.ts` de la marque.
- Pour étendre un composant du socle, créez une sous-classe (`class AcmeButton extends Button`, `static styles = [Button.styles ?? [], acmeButtonStyles]`). Passez-la dans `overrides: { button: AcmeButton }`.

Le guide complet est `src/docs/guides/design-system-de-marque.mdx`.
