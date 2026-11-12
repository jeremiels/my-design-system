---
name: component-styling
description: Écrire ou modifier le CSS d'un composant ou d'un mixin (la feuille .css voisine de son .ts), ou des composants d'une marque — tokens de composant, variantes, tailles, parts, états. À charger pour tout style de shadow DOM. Le CSS de la page et les valeurs des tokens (src/styles) suivent la référence « Tokens et couches CSS ».
---

# Styles d'un composant

Les règles des tokens sont dans `src/docs/reference/tokens-et-couches.mdx`. Lisez cette page avant d'écrire une feuille. Leurs raisons sont dans `src/docs/explication/architecture-css.mdx`.

Exemples : `src/components/button/button-base.css` (tokens, variantes, tailles, `forced-colors`) et `src/components/modal/modal.css` (parts, exception `::backdrop`).

## 1. Créez la feuille

Écrivez les styles dans une feuille `.css` voisine. Importez-la comme CSS module script, après les feuilles héritées :

```ts
import alertStyles from "./alert.css" with { type: "css" };
static styles = [DSBaseElement.styles ?? [], alertStyles];
```

- N'utilisez jamais le gabarit `css` de Lit.
- N'importez jamais une feuille de `src/styles/` ainsi : ce sont les feuilles de la page.
- Un mixin suit la même règle (`withDisabled.css`). Une marque aussi, avec le plugin `my-design-system/vite-plugin`.

## 2. Déclarez les tokens du composant

```css
:host {
  --u-button-background-color: var(--u-color-action-bg);
}

.button {
  background-color: var(--u-button-background-color);
}
```

- Déclarez chaque token sur `:host`. Sa valeur par défaut est un token sémantique.
- Nommez-le `--u-<composant>-<propriété-css>[-<état>]`. Un composant de marque prend le préfixe de la marque : `--acme-card-padding`.
- Faites lire les tokens par les règles internes. Une règle interne ne redéclare jamais un token.
- N'écrivez pas de valeur de repli littérale dans `var()`. Les deux exceptions sont dans la référence.
- Documentez chaque token avec `@cssprop` (skill `component-api-docs`). Ne déclarez pas de token que rien ne lit.

## 3. Ajoutez les variantes et les tailles

```css
:host([variant="danger"]) {
  --u-button-background-color: var(--u-color-danger-bg);
}
```

- Changez les valeurs par défaut des tokens sur l'hôte, à partir de l'attribut : `:host([variant="…"])`, `:host([size="…"])`.
- Reflétez la propriété en attribut : `@property({ type: String, reflect: true })`.
- Ne changez pas les propriétés CSS dans une variante : changez les tokens.

`src/api-contract.test.ts` échoue si un token documenté est redéclaré hors de `:host`.

## 4. Exposez les parts et les états

- Ajoutez `part="…"` aux éléments internes qu'une marque peut styler. Documentez chaque part avec `@csspart`.
- Stylez les états de l'hôte par ses attributs : `:host([disabled])`. Ajoutez `:host(:disabled)` pour un composant associé à un formulaire.
- Nommez les classes internes `.bloc` et `.bloc--modificateur` (`.alert--pending`). Elles ne sont pas une API : une marque vise les parts (`[part~="button"]`).
- Un composant ne contient aucune logique de thème. Les thèmes changent les primitives.
- Lisez les durées dans `--u-motion-duration-*`. Le mouvement réduit est déjà traité dans `tokens/motion.css`.

## 5. Vérifiez le support navigateurs

Vérifiez toute fonctionnalité CSS récente contre `src/docs/reference/support-navigateurs.mdx`. `:state()`, `text-wrap` et `interpolate-size` sont des améliorations progressives.

## 6. Vérifiez

```sh
npm run analyze && npx vitest run   # test de contrat (tokens, parts), stories dans 3 moteurs
npm run compat                      # syntaxe et fonctionnalités caniuse contre la matrice
```
