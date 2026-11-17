---
name: design-tokens
description: Ajouter, renommer ou changer un token du socle ou d'une marque, à tout niveau — primitive, palette, token sémantique, thème clair ou sombre, mouvement réduit, token de composant, variante — dans les sources DTCG (packages/tokens/src/) et leur resolver, puis générer le CSS. À charger pour tout changement de packages/tokens/, d'un terrazzo.config.ts ou d'un fichier *.tokens.css.
---

# Tokens DTCG

Les règles sont dans `docs/reference/tokens-et-couches.mdx` : niveaux, nommage, modifiers, sorties, thèmes, contraste. Leurs raisons sont dans `docs/explication/architecture-css.mdx`, dans l'ADR 0002 (`docs/adr/0002-tokens-dtcg.mdx`) et dans l'ADR 0003 (`docs/adr/0003-packages-tokens-et-composants.mdx`). Lisez la référence avant de changer un token.

Les sources DTCG vivent dans `@unicorne/tokens` (`packages/tokens/src/`), tokens de composant compris : le web, iOS et Android les lisent. La liaison web des tokens de composant vit dans `@unicorne/components` (`packages/components/terrazzo.config.ts`).

Exemples : `packages/tokens/src/u.resolver.json`, `packages/tokens/src/semantic/theme.light.tokens.json`, `packages/tokens/src/component/button/`.

## 1. Choisissez le niveau

Les chemins de cette section et des deux suivantes partent de `packages/tokens/src/`.

- Une valeur brute (une couleur, une taille) : une primitive, dans `primitive/`.
- Une intention que plusieurs composants partagent : un token sémantique, dans `semantic/`.
- Un réglage d'un seul composant : un token de composant, dans `component/<composant>/`.

Ne mettez jamais de valeur littérale hors des primitives. Ne faites jamais pointer un composant vers une primitive. N'écrivez rien de propre au web dans les sources : ni sélecteur, ni nom d'attribut.

## 2. Écrivez le token

- **Primitive :** une valeur au format DTCG. Une couleur est `{ "colorSpace": "srgb", "components": […], "hex": "#…" }`. Une dimension est `{ "value": 1, "unit": "rem" }`.
- **Couleur de palette :** gardez l'échelle de clarté de 100 à 900. Un pas 600 porte un texte blanc, un pas 300 un texte presque noir.
- **Token sémantique de couleur :** écrivez-le dans `theme.light.tokens.json` et dans `theme.dark.tokens.json`, avec un pas par thème. Le build échoue si les deux thèmes diffèrent.
- **Token sémantique sans thème :** écrivez-le dans `semantic.tokens.json`. Une durée a aussi sa valeur dans `motion.reduced.tokens.json`.
- **Token de composant :** un alias de token sémantique, avec `$type` et `$description` en anglais. La description documente le composant dans le manifest.
- Donnez `$type` au groupe quand tous ses tokens ont le même type.

## 3. Ajoutez une variante ou un attribut

1. Écrivez un fichier par valeur : `component/<composant>/<attribut>.<valeur>.tokens.json`. Il contient seulement les tokens que la valeur change.
2. Déclarez le modifier `<composant>-<attribut>` dans `u.resolver.json`. Son contexte par défaut est vide.
3. Ajoutez le modifier à `resolutionOrder`, après le set `component`.
4. Dans `packages/components/terrazzo.config.ts`, associez le modifier à l'attribut : `attributes: { "<composant>-<attribut>": "<attribut>" }`.
5. Reflétez la propriété en attribut dans la classe : `@property({ type: String, reflect: true })`.

## 4. Ajoutez les tokens d'un nouveau composant

1. Créez `packages/tokens/src/component/<composant>/<composant>.tokens.json`, avec un groupe `<composant>`.
2. Ajoutez le fichier au set `component` du resolver.
3. Ajoutez la sortie dans `packages/components/terrazzo.config.ts` : `<composant>: { file: "components/<composant>/<composant>.tokens.css" }`.
4. Dans la classe, importez la feuille générée et placez-la avant la feuille du composant, dans `static styles`.
5. Ajoutez `@tokens <composant>` à la JSDoc de la classe (skill `component-api-docs`).

## 5. Générez et vérifiez

```sh
npm run tokens                         # CSS des deux packages ; échoue si une règle des niveaux est enfreinte
npm run analyze                        # manifest : tokens de composant, défauts, descriptions
git add packages
npm run check                          # tokens:check, api:check, contrat, contraste clair et sombre
npm run example                        # ACME, construit sur les sources du socle
```

- N'éditez jamais un fichier généré : `packages/tokens/css/tokens.css`, `packages/components/src/components/*/*.tokens.css`.
- Un token renommé ou retiré est une rupture pour les marques et pour les plateformes natives : une version majeure de `@unicorne/tokens`. Relisez le diff de `packages/components/custom-elements.json`, et cherchez l'ancien nom dans `examples/` et `docs/`.
- Une nouvelle paire de couleurs de premier plan et de fond va dans `contrastPairs` (`packages/tokens/testing/contrast.ts`).

## Tokens d'une marque

Une marque range ses fichiers comme le socle : `primitive/`, `semantic/`, `component/<composant>/`. `brandResolver()` (`@unicorne/tokens/terrazzo-plugin`) écrit son resolver : les sets et les modifiers du socle, puis ses fichiers. Sa config Terrazzo passe `brand: "<marque>"` et `layer: "u.tokens.brand"` à `tokensCss()` : la sortie vise `[data-brand="<marque>"]` et se limite à ses fichiers. Le guide est `docs/guides/design-system-de-marque.mdx`.

## Thèmes et zones

- N'écrivez aucun sélecteur de thème dans une feuille : le plugin émet les contextes `theme` sur `[data-theme]` et sur les conteneurs `[data-brand]` (`pageSelectors()` de `packages/tokens/plugins/terrazzo-plugin.ts`).
- Un token sémantique de couleur a une valeur par thème. Le plugin la déclare dans la zone claire comme dans la zone sombre.
- Les règles des zones sont dans `docs/reference/tokens-et-couches.mdx`, section Thèmes. Leur test est `packages/tokens/testing/tokens.test.ts`.
