---
name: design-tokens
description: Ajouter, renommer ou changer un token du socle ou d'une marque, à tout niveau — primitive, palette, token sémantique, thème clair ou sombre, mouvement réduit, token de composant, variante — dans les sources DTCG (tokens/) et leur resolver, puis générer le CSS. À charger pour tout changement de tokens/, de terrazzo.config.ts ou d'un fichier *.tokens.css.
---

# Tokens DTCG

Les règles sont dans `src/docs/reference/tokens-et-couches.mdx` : niveaux, nommage, modifiers, sorties, thèmes, contraste. Leurs raisons sont dans `src/docs/explication/architecture-css.mdx` et dans l'ADR 0002 (`src/docs/adr/0002-tokens-dtcg.mdx`). Lisez la référence avant de changer un token.

Exemples : `tokens/u.resolver.json`, `tokens/semantic/theme.light.tokens.json`, `tokens/component/button/`.

## 1. Choisissez le niveau

- Une valeur brute (une couleur, une taille) : une primitive, dans `tokens/primitive/`.
- Une intention que plusieurs composants partagent : un token sémantique, dans `tokens/semantic/`.
- Un réglage d'un seul composant : un token de composant, dans `tokens/component/<composant>/`.

Ne mettez jamais de valeur littérale hors des primitives. Ne faites jamais pointer un composant vers une primitive.

## 2. Écrivez le token

- **Primitive :** une valeur au format DTCG. Une couleur est `{ "colorSpace": "srgb", "components": […], "hex": "#…" }`. Une dimension est `{ "value": 1, "unit": "rem" }`.
- **Couleur de palette :** gardez l'échelle de clarté de 100 à 900. Un pas 600 porte un texte blanc, un pas 300 un texte presque noir.
- **Token sémantique de couleur :** écrivez-le dans `theme.light.tokens.json` et dans `theme.dark.tokens.json`, avec un pas par thème. Le build échoue si les deux thèmes diffèrent.
- **Token sémantique sans thème :** écrivez-le dans `semantic.tokens.json`. Une durée a aussi sa valeur dans `motion.reduced.tokens.json`.
- **Token de composant :** un alias de token sémantique, avec `$type` et `$description` en anglais. La description documente le composant dans le manifest.
- Donnez `$type` au groupe quand tous ses tokens ont le même type.

## 3. Ajoutez une variante ou un attribut

1. Écrivez un fichier par valeur : `tokens/component/<composant>/<attribut>.<valeur>.tokens.json`. Il contient seulement les tokens que la valeur change.
2. Déclarez le modifier `<composant>-<attribut>` dans `tokens/u.resolver.json`. Son contexte par défaut est vide.
3. Ajoutez le modifier à `resolutionOrder`, après le set `component`.
4. Dans `terrazzo.config.ts`, associez le modifier à l'attribut : `attributes: { "<composant>-<attribut>": "<attribut>" }`.
5. Reflétez la propriété en attribut dans la classe : `@property({ type: String, reflect: true })`.

## 4. Ajoutez les tokens d'un nouveau composant

1. Créez `tokens/component/<composant>/<composant>.tokens.json`, avec un groupe `<composant>`.
2. Ajoutez le fichier au set `component` du resolver.
3. Ajoutez la sortie dans `terrazzo.config.ts` : `<composant>: { file: "components/<composant>/<composant>.tokens.css" }`.
4. Dans la classe, importez la feuille générée et placez-la avant la feuille du composant, dans `static styles`.
5. Ajoutez `@tokens <composant>` à la JSDoc de la classe (skill `component-api-docs`).

## 5. Générez et vérifiez

```sh
npm run tokens                         # CSS généré ; échoue si une règle des niveaux est enfreinte
npm run analyze                        # manifest : tokens de composant, défauts, descriptions
git add tokens src custom-elements.json
npm run check                          # tokens:check, api:check, contrat, contraste clair et sombre
npm run example                        # ACME, construit sur les sources du socle
```

- N'éditez jamais un fichier généré : `src/styles/tokens.css`, `src/components/*/*.tokens.css`.
- Un token renommé ou retiré est une rupture pour les marques. Relisez le diff de `custom-elements.json` et cherchez l'ancien nom dans `examples/` et `src/docs/`.
- Une nouvelle paire de couleurs de premier plan et de fond va dans `contrastPairs` (`src/testing/contrast.ts`).

## Tokens d'une marque

Une marque a son resolver, qui liste les fichiers du socle puis les siens (`examples/acme-design-system/tokens/acme.resolver.json`). Sa config Terrazzo utilise `my-design-system/terrazzo-plugin` avec `layer: "u.tokens.brand"` et `emit`, qui limite la sortie à ses fichiers. Le guide est `src/docs/guides/design-system-de-marque.mdx`.
