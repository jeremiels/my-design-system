---
name: component-styling
description: Écrire ou modifier le CSS d'un composant ou d'un mixin (la feuille .css voisine de son .ts), ou des composants d'une marque — lecture des tokens, parts, états, forced-colors. À charger pour tout style de shadow DOM. Les tokens eux-mêmes (sources DTCG, variantes) relèvent du skill design-tokens.
---

# Styles d'un composant

Les règles des tokens sont dans `docs/reference/tokens-et-couches.mdx`. Lisez cette page avant d'écrire une feuille. Leurs raisons sont dans `docs/explication/architecture-css.mdx`.

Exemples : `packages/components/src/bases/button/button-base.css` (lecture des tokens, `forced-colors`) et `packages/components/src/components/modal/modal.css` (parts, exception `::backdrop`).

## 1. Créez la feuille

Écrivez les styles dans une feuille `.css` voisine. Importez-la comme CSS module script, après les feuilles héritées :

```ts
import alertStyles from "./alert.css" with { type: "css" };
static styles = [DSBaseElement.styles ?? [], alertStyles];
```

- N'utilisez jamais le gabarit `css` de Lit. L'import donne déjà un `CSSResult`, que Lit adopte dans le navigateur et rend sur un serveur.
- N'importez jamais une feuille de `packages/components/src/styles/` ainsi : ce sont les feuilles de la page.
- Un mixin suit la même règle (`withDisabled.css`). Un contrôleur exporte sa feuille, et le composant l'ajoute à `static styles` (`controllers/listbox.css`). Une marque aussi, avec le plugin `@unicorne/components/vite-plugin`.

## 2. Lisez les tokens du composant

Les tokens d'un composant sont des sources DTCG, dans `packages/tokens/src/component/<composant>/` (skill `design-tokens`). `npm run tokens` les génère sur `:host`, dans `<composant>.tokens.css`. La feuille du composant les lit seulement :

```css
.button {
  background-color: var(--u-button-background-color);
}
```

- Adoptez la feuille générée avant la feuille du composant : `static styles = [DSBaseElement.styles ?? [], buttonTokens, buttonStyles]`.
- Ne déclarez aucun token dans la feuille du composant. Une règle interne ne redéclare jamais un token.
- Faites lire aux règles internes les tokens du composant, pas les tokens sémantiques. Un besoin nouveau est un token nouveau.
- N'écrivez pas de valeur de repli littérale dans `var()`. Les deux exceptions sont dans la référence.
- Ne déclarez pas de token que rien ne lit.

## 3. Ajoutez les variantes et les tailles

Une variante est un contexte de modifier dans les sources DTCG (skill `design-tokens`, étape 3). Le plugin la génère en règle `:host([variant="danger"])`, avec les tokens qu'elle change.

- Reflétez la propriété en attribut : `@property({ type: String, reflect: true })`.
- Ne changez pas les propriétés CSS dans une variante : changez les tokens.

`packages/components/src/api-contract.test.ts` échoue si un token documenté est redéclaré hors de `:host`.

## 4. Exposez les parts et les états

- Ajoutez `part="…"` aux éléments internes qu'une marque peut styler. Documentez chaque part avec `@csspart`.
- Stylez les états de l'hôte par ses attributs : `:host([disabled])`. Ajoutez `:host(:disabled)` pour un composant associé à un formulaire.
- Nommez les classes internes `.bloc` et `.bloc--modificateur` (`.alert--pending`). Elles ne sont pas une API : une marque vise les parts (`[part~="button"]`).
- Un composant ne contient aucune logique de thème. Les thèmes changent les tokens sémantiques.
- Faites pointer les durées vers `motion.duration.*`. Le contexte `motion: reduced` traite déjà le mouvement réduit.
- Animez l'entrée et la sortie d'un élément du top layer (`<dialog>`, popover) comme `modal.css` : `@starting-style`, `display` et `overlay` dans les transitions, état ouvert suivi de `:where(:not([data-closing]))`. `closeWithTransition()` gère la sortie dans Firefox et Safari.
- Un popover d'`AnchoredPopoverController` écrit son état ouvert sur `[data-open]`, pas sur `:popover-open` (`combobox-base.css`). Sa marge de bloc est l'espace sous son ancre. Le contrôleur le place et le masque fermé. Le composant ajoute `anchoredPopoverStyles` à `static styles`.

## 5. Vérifiez le support navigateurs

Vérifiez toute fonctionnalité CSS récente contre `docs/reference/support-navigateurs.mdx`. `:state()`, `text-wrap` et `interpolate-size` sont des améliorations progressives.

## 6. Vérifiez

```sh
npm run analyze && npx vitest run   # test de contrat (tokens, parts), stories dans 3 moteurs
npm run compat                      # syntaxe et fonctionnalités caniuse contre la matrice
```
