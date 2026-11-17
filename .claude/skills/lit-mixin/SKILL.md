---
name: lit-mixin
description: Partager un comportement entre composants du socle — choisir entre un mixin (packages/components/src/mixins/withX.ts), un reactive controller (src/controllers/) et une fonction d'état (src/state/), puis l'écrire, le tester, le documenter et l'exporter. À charger quand plusieurs composants partagent un comportement, quand un composant a plusieurs dimensions d'état, ou quand les marques doivent réutiliser une brique.
---

# Mixins, contrôleurs et état

Une brique partagée est une API publique : les marques l'utilisent dans leurs composants, et `packages/components/src/index.ts` l'exporte. La décision est dans l'ADR 0010 (`docs/adr/0010-etat-controleurs-et-mixins.mdx`). Les références sont `docs/reference/mixins.mdx` et `docs/reference/controleurs.mdx`.

Exemples :

- `packages/components/src/mixins/withDisabled.ts` : un mixin, avec une propriété, des styles et de l'ARIA dans le cycle de vie.
- `packages/components/src/mixins/withInternals.ts` : un mixin sur une base abstraite, pour une API du navigateur à usage unique.
- `packages/components/src/mixins/withInvoker.ts` : un mixin qui passe ses attributs à un élément du template, avec un polyfill chargé à la demande.
- `packages/components/src/controllers/commands.ts` : un contrôleur avec une fonction de rappel.
- `packages/components/src/controllers/anchored-popover.ts` : un contrôleur avec sa feuille exportée et un repli chargé à la demande.
- `packages/components/src/controllers/listbox.ts` : un contrôleur qui rend, sans état propre.
- `packages/components/src/controllers/exit-transition.ts` : des fonctions, pour un comportement sans état d'hôte.
- `packages/components/src/state/combobox.ts` : une fonction d'état et ses tests dans Node.

## Choisissez la forme

- Le comportement ajoute une propriété, un attribut ou une méthode publique au composant : un mixin.
- Le comportement relie le composant au DOM, sans API publique : un reactive controller.
- Le comportement ne tient aucun état d'un composant : des fonctions.
- Le composant a plusieurs dimensions d'état qui interagissent (un popup, un élément actif, une saisie) : une fonction d'état dans `src/state/`.
- Le comportement est commun à tous les composants : `DSBaseElement`, qui reste mince.
- Le comportement est propre à une famille (`button`, `button-link`) : une classe de base abstraite (`ButtonBase`).

## Écrivez une fonction d'état

```ts
// src/state/combobox.ts
export function comboboxReducer(
  state: ComboboxState,
  event: ComboboxEvent,
  context: ComboboxContext,
): ComboboxState {
  switch (event.type) {
    case "close":
      return update(state, closedCombobox);
    // …
  }
}
```

- N'importez ni Lit ni le DOM. Le composant lit le DOM et le passe dans un contexte.
- Exportez le type de l'état, le type des événements (une union par `type`) et la fonction.
- Renvoyez le même objet quand rien ne change : le composant compare les références.
- Écrivez le test à côté, `<nom>.test.ts`. Il tourne dans Node, dans le projet Vitest `unit`.
- Le composant tient l'état, envoie les événements et demande un rendu : voir `ComboboxBase.dispatch()`.

## Écrivez un contrôleur

```ts
import type { ReactiveController, ReactiveControllerHost } from "lit";
import xStyles from "./x.css" with { type: "css" };

export { xStyles };

export class XController implements ReactiveController {
  constructor(host: ReactiveControllerHost & HTMLElement, onChange: () => void) {
    host.addController(this);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
```

- **Nom :** `XController`, dans `packages/components/src/controllers/<nom>.ts`, avec ses styles dans `<nom>.css`.
- **Contrat :** recevez les éléments, les `id` et les fonctions de rappel par le constructeur. Ne supposez aucun `id` ni attribut d'une autre brique.
- **Styles :** un contrôleur n'adopte aucune feuille. Exportez la feuille : le composant l'ajoute à `static styles`.
- **Tokens :** un contrôleur qui peint lit un groupe de tokens partagé (`listbox`). Le composant écrit `@tokens <groupe>`.
- **État :** gardez l'état dans le composant ou dans une fonction d'état, et lisez-le par une fonction (`activeIndex: () => number`).
- **Extension :** le composant déclare les membres `protected` qu'une marque surcharge, et les passe au contrôleur. Un contrôleur n'apparaît pas dans le manifest.
- **Rendu serveur :** seul le constructeur d'un contrôleur s'exécute sur un serveur. Lisez le DOM dans `hostConnected()` ou après.

## Écrivez un mixin

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
- **Styles :** ajoutez-les à ceux de la base : `[(Base as unknown as typeof LitElement).styles ?? [], xStyles]`.
- **Noms :** vérifiez qu'aucun membre ne masque un membre de `HTMLElement` (`matches`, `popover`, `showPopover`). TypeScript le refuse, mais tard.
- **Cycle de vie :** appelez toujours `super` (`updated`, `connectedCallback`, `disconnectedCallback`, `firstUpdated`). Le constructeur reçoit et transmet `...args`.
- **API à usage unique :** n'appelez jamais `attachInternals()` dans un autre mixin. Exigez `withInternals()` et lisez `this.internals`.
- **Application :** écrivez-le dans `extends` : `class ButtonBase extends withDisabled(DSBaseElement)`. Jamais par une constante : l'analyseur du manifest perdrait les membres hérités.

## Règles communes

- Les règles du skill `component-styling` s'appliquent aux feuilles : des tokens, jamais de valeur littérale.
- Protégez une API absente de la matrice, et réduisez-la à une opération sans effet. Un polyfill se charge par `import()`, seulement là où l'API manque, depuis `packages/components/src/polyfills/`. Ajoutez son package à `rollupOptions.external` de `packages/components/vite.config.ts`.
- Un module s'importe sans DOM : aucun accès à `document`, `CSS` ou `HTMLElement` à son chargement sans test de `typeof`.

## Documentez et exportez

1. Documentez chaque membre public en JSDoc (skill `component-api-docs`).
2. Ajoutez une section à `docs/reference/mixins.mdx` pour un mixin, à `docs/reference/controleurs.mdx` pour un contrôleur ou une fonction d'état (skill `storybook-documentation`).
3. Exportez la brique, sa feuille et ses types depuis `packages/components/src/index.ts`.

## Vérifiez

```sh
npx tsc -p tsconfig.json --noEmit
npx vitest run --project unit packages/components/src/state   # les fonctions d'état, dans Node
npm run analyze   # les membres d'un mixin apparaissent sur les composants qui l'appliquent
npx vitest run    # les contrôleurs dans Chromium, le rendu serveur et les stories dans 3 moteurs
```
