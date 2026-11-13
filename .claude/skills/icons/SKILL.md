---
name: icons
description: Ajouter, remplacer ou retirer une icône SVG du socle (packages/icons/) ou d'une marque, et rendre une icône dans un composant. À charger pour tout changement de packages/icons/, des icônes d'une marque, ou d'un composant qui affiche une icône.
---

# Icônes

Les règles des sources, les sorties et le chargement sont dans `docs/reference/icones.mdx`. Les décisions sont dans l'ADR 0005 (`docs/adr/0005-icones.mdx`). Lisez la référence avant de changer une icône.

Exemples : `packages/icons/src/information.svg`, `packages/components/src/components/icon/icon.ts`, `packages/components/src/components/alert/alert.ts` (rend une icône), `examples/acme-design-system/src/components/acme-icon/acme-icon.ts` (marque).

## Ajouter ou changer une icône du socle

1. Écrivez `packages/icons/src/<nom>.svg`, sur une grille de 24 × 24. Un export Figma convient tel quel.
2. Lancez `npm run icons`. La commande écrit `packages/icons/js/` et `packages/icons/svg/`, ou liste les fichiers refusés.
3. Corrigez chaque fichier refusé dans sa source. N'éditez jamais `js/` ni `svg/`.
4. Ouvrez la story `Components/Icon/Gallery` : l'icône y apparaît.
5. Indexez les sorties (`git add packages/icons`), puis lancez `npm run check`.

- Le nom d'une icône est une API. Le renommer ou le retirer est une rupture pour les marques : cherchez le nom dans `packages/`, `examples/` et `docs/`.
- Une icône utilisée par un composant du socle ne se retire pas : `alert` affiche `information`, `success`, `warning` et `danger`.

## Rendre une icône dans un composant

```ts
import { html } from "lit/static-html.js";
import { Icon } from "../icon/icon.js";

static override dependencies = [Icon];

render() {
  const icon = this.tagFor(Icon);
  return html`<${icon} part="icon" name="close"></${icon}>`;
}
```

- Rendez l'icône avec `tagFor(Icon)`, jamais avec `<u-icon>` en dur : l'icône d'une marque serait ignorée.
- Une icône décorative n'a pas de `label`. Une icône seule porteuse de sens, comme un bouton sans texte, a un `label` traduisible : une propriété avec une valeur par défaut.
- Documentez la part de l'icône avec `@csspart` (skill `component-api-docs`).
- Vérifiez dans une story que l'icône rend un `<svg>`, après `await icon.updateComplete`.

## Icônes d'une marque

Le guide est `docs/guides/design-system-de-marque.mdx`, étape 6.

1. Écrivez les icônes dans `icons/<nom>.svg`. Le nom d'une icône du socle la remplace.
2. Générez-les avant Vite : `unicorne-icons icons --out src/icons --export acmeIcons`.
3. Étendez le set dans une sous-classe : `static override icons = { ...Icon.icons, ...acmeIcons }`.
4. Passez la sous-classe dans `overrides: { icon: AcmeIcon }` de `defineComponents()`.

## Vérifiez

```sh
npx vitest run --project unit packages/icons   # le générateur
npm run icons && git add packages/icons && npm run check
npm run example                                # ACME : remplacement, icônes téléchargées
```
