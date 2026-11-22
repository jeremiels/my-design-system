---
name: icons
description: Ajouter, remplacer ou retirer une icône SVG du socle (packages/icons/) ou d'une marque, et rendre une icône dans un composant. À charger pour tout changement de packages/icons/, des icônes d'une marque, ou d'un composant qui affiche une icône.
---

# Icônes

Les règles des sources, les sorties et le chargement sont dans `docs/reference/icones.mdx`. Les décisions sont dans l'ADR 0005 (`docs/adr/0005-icones.mdx`). Lisez la référence avant de changer une icône.

Exemples : `packages/icons/src/information.svg`, `packages/components/src/components/icon/icon.ts`, `packages/components/src/components/alert/alert.ts` (rend une icône), `examples/acme-design-system/src/design-system.ts` (marque).

## Ajouter ou changer une icône du socle

1. Écrivez `packages/icons/src/<nom>.svg`, sur une grille de 24 × 24. Un export Figma convient tel quel.
2. Écrivez `packages/icons/src/<nom>.json` : `description` (son sens, en anglais), `tags` (les mots qui la trouvent), `categories`. Les agents choisissent une icône par ces mots (ADR 0044).
3. Lancez `npm run icons`. La commande écrit `packages/icons/js/`, `packages/icons/svg/` et `packages/icons/icon-manifest.json`, ou liste les fichiers refusés.
4. Corrigez chaque fichier refusé dans sa source. N'éditez jamais `js/`, `svg/` ni `icon-manifest.json`.
5. Ouvrez la story `Components/Icon/Gallery` : l'icône y apparaît. `npx unicorne icons` la liste.
6. Indexez les sorties (`git add packages/icons`), puis lancez `npm run check`.

- Le nom d'une icône est une API. La retirer est une rupture pour les marques : cherchez le nom dans `packages/`, `examples/` et `docs/`.
- Pour renommer une icône, renommez ses fichiers, puis gardez l'ancien nom dans `aliases` de son `.json` : `{ "name": "<ancien>", "deprecated": true, "deprecationReason": "alias.name" }`. L'ancien nom s'affiche encore, et `check` le corrige (ADR 0049).
- Une icône utilisée par un composant du socle ne se retire pas : `alert` affiche `information`, `success`, `warning` et `danger`, et `modal` affiche `close`.

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
- Rendez une icône par `Icon`, jamais par `unsafeHTML()` ni par un masque CSS (ADR 0005, D6).
- Une icône décorative n'a pas de `label`. Une icône seule porteuse de sens, comme un bouton sans texte, a un `label` traduisible : une propriété avec une valeur par défaut.
- Documentez la part de l'icône avec `@csspart` (skill `component-api-docs`).
- Vérifiez dans une story que l'icône rend un `<svg>`, après `await icon.updateComplete`.

## Icônes d'une marque

Le guide est `docs/guides/design-system-de-marque.mdx`, étape 6.

1. Écrivez les icônes dans `icons/<nom>.svg`, et leurs métadonnées dans `icons/<nom>.json`. Le nom d'une icône du socle la remplace.
2. Générez-les avant Vite : `unicorne-icons icons --out src/icons --export acmeIcons --manifest icon-manifest.json`.
3. Passez-les à `designSystem()` : `icons: acmeIcons`, et leurs alias, `iconAliases: acmeIconAliases`. Elles passent par-dessus les icônes du socle, nom par nom.
4. Publiez `icon-manifest.json`, et passez-le à `extendDocs()` : `icons: await readIconManifest(…)`. Ses outils de documentation listent alors ses icônes, et `check` refuse un nom inconnu.

## Vérifiez

```sh
npx vitest run --project unit packages/icons   # le générateur
npm run icons && git add packages/icons && npm run check
npm run example                                # ACME : remplacement, icônes téléchargées
```
