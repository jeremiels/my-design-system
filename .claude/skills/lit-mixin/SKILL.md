---
name: lit-mixin
description: Créer ou modifier un mixin de comportement du socle (packages/components/src/mixins/withX.ts) — quand choisir un mixin, sa signature, la fusion des styles, son interface publique, son cycle de vie, sa composition avec withInternals, sa documentation et son export. À charger quand plusieurs composants partagent un comportement, ou quand les marques doivent l'ajouter à leurs composants.
---

# Mixins de comportement

Exemples : `packages/components/src/mixins/withDisabled.ts` (propriété, styles, ARIA dans le cycle de vie) et `packages/components/src/mixins/withInternals.ts` (bases abstraites, API du navigateur à usage unique).

Un mixin est une API publique : les marques l'appliquent à leurs composants, et `packages/components/src/index.ts` l'exporte. La référence des mixins existants est `docs/reference/mixins.mdx`.

## Quand en écrire un

- Un comportement utile à plusieurs composants, indépendant de leur template (désactivation, formulaire, délégation du focus) : un mixin.
- Un comportement commun à tous les composants : `DSBaseElement`, qui reste mince.
- Un comportement propre à une famille (`button`, `button-link`) : une classe de base abstraite (`ButtonBase`).

## Forme

```ts
import { LitElement, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type { Constructor } from "../types/common.js";
import disabledStyles from "./withDisabled.css" with { type: "css" };

export declare class DisabledInterface {
  disabled: boolean;
}

/** Mixin: … */
export function withDisabled<T extends Constructor<LitElement>>(Base: T) {
  class DisabledElement extends Base {
    /** Disables interaction; also sets `aria-disabled="true"` on the host. */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    static styles = [(Base as unknown as typeof LitElement).styles ?? [], disabledStyles];

    protected updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);
      // …
    }
  }
  return DisabledElement as Constructor<DisabledInterface> & T;
}
```

- **Nom :** `withX`, dans `packages/components/src/mixins/withX.ts`, avec ses styles dans `withX.css`.
- **Signature :** `Constructor<LitElement>`. Prenez `AbstractConstructor`, avec une `abstract class` à l'intérieur, pour accepter une base abstraite comme `ButtonBase` (voir `withInternals`).
- **Membres publics :** déclarez-les dans une classe `declare class XInterface` exportée. Convertissez le retour en `Constructor<XInterface> & T` : TypeScript voit alors les membres sur le composant.
- **Styles :** ajoutez-les à ceux de la base : `[(Base as unknown as typeof LitElement).styles ?? [], xStyles]`. Les règles du skill `component-styling` s'appliquent : des tokens, jamais de valeur littérale.
- **Cycle de vie :** appelez toujours `super` (`updated`, `connectedCallback`, `disconnectedCallback`, `firstUpdated`). Le constructeur reçoit et transmet `...args`. Les mixins s'empilent ainsi dans n'importe quel ordre.
- **API à usage unique :** n'appelez jamais `attachInternals()` dans un autre mixin. Exigez `withInternals()` et lisez `this.internals`.
- **Support navigateurs :** protégez une API absente de la matrice, et réduisez-la à une opération sans effet (`customStates` de `withInternals`).

## Appliquez-le

- Écrivez-le dans `extends` : `class ButtonBase extends withDisabled(DSBaseElement)`. Jamais par une constante : l'analyseur du manifest perdrait les membres hérités.
- Les mixins s'empilent dans la hiérarchie : `Button extends withInternals(ButtonBase)`, et `ButtonBase extends withDisabled(DSBaseElement)`.

## Documentez et exportez

1. Documentez chaque membre public en JSDoc. La description apparaît sur chaque composant qui applique le mixin (skill `component-api-docs`).
2. Ajoutez une section au mixin dans `docs/reference/mixins.mdx` : rôle, membres, comportement, support navigateurs, pièges (skill `storybook-documentation`).
3. Exportez le mixin et son interface depuis `packages/components/src/index.ts`.

## Vérifiez

```sh
npx tsc -p tsconfig.json --noEmit
npm run analyze   # les membres apparaissent sur les composants qui appliquent le mixin
npx vitest run
```
