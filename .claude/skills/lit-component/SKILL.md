---
name: lit-component
description: Écrire ou modifier la classe d'un composant Lit du socle (packages/components/src/components/**/*.ts) ou d'une marque — propriétés, rendu, événements, rendu d'autres composants, ElementInternals, accessibilité, extension par les marques. À charger pour tout changement du TypeScript d'un composant, avec component-styling pour son CSS et component-api-docs pour sa JSDoc.
---

# Classe d'un composant Lit

Les marques étendent les classes du socle et les enregistrent sous leur préfixe (ADR 0001, `docs/adr/0001-architecture-multi-marque.mdx`). Chaque règle de ce skill garde ces extensions fonctionnelles.

Exemples : `packages/components/src/components/alert/alert.ts` (simple), `packages/components/src/components/button/button-base.ts` et `button.ts` (base partagée, mixins, formulaire), `packages/components/src/components/modal/modal.ts` (rend un autre composant), `examples/acme-design-system/src/components/acme-card/acme-card.ts` (composant de marque).

## Anatomie

```ts
import { property } from "lit/decorators.js";
import { html } from "lit";
import { DSBaseElement } from "../base-element.js";
import alertStyles from "./alert.css" with { type: "css" };
import type { AlertType } from "./alert.type.js";

/** …JSDoc de la classe : voir component-api-docs… */
export class Alert extends DSBaseElement {
  static override componentName = "alert";

  /** Alert type: sets the colors and how assistive technologies announce it. */
  @property({ type: String, reflect: true })
  type: AlertType = "information";

  static styles = [DSBaseElement.styles ?? [], alertTokens, alertStyles];

  render() {
    return html`<div part="alert" class="alert">…</div>`;
  }
}
```

- **Classe de base :** étendez `DSBaseElement` ou un autre composant. Appliquez les mixins dans `extends` (`extends withDisabled(DSBaseElement)`), jamais par une constante : l'analyseur du manifest ne suit que l'héritage écrit en ligne.
- **`static componentName` :** la balise sans préfixe (`"button-link"`). Déclarez-le sur chaque composant concret, jamais sur une base abstraite (`ButtonBase`).
- **Enregistrement :** pas de `@customElement`, pas de `customElements.define`. `defineComponents()` enregistre (skill `create-component`).
- **Styles :** `static styles = [super.styles ?? [], tokens, feuille]`. `tokens` est la feuille générée `<nom>.tokens.css` (skill `design-tokens`), `feuille` la feuille `.css` voisine (skill `component-styling`).
- **Types :** les unions dans `<nom>.type.ts`, les types partagés dans `packages/components/src/types/common.ts` (`ComponentSize`, `SemanticVariant`). Pas de préfixe `My`.

## Propriétés

- Déclarez chaque propriété avec `@property({ type: … })` et une description JSDoc d'une ligne. L'initialiseur donne la valeur par défaut.
- Ajoutez `reflect: true` seulement quand le CSS ou l'ARIA lit l'attribut. Les variantes et les tailles le lisent : leurs tokens sont générés en règles `:host([variant="…"])`.
- Nommez un attribut de plusieurs mots explicitement : `attribute: "action-label"`.
- État interne : champs `private` ou `#private`, ou `@state()`. Un membre public pour TypeScript mais hors API reçoit `/** @internal */`.

## Rendre un autre composant

```ts
import { html } from "lit/static-html.js";
import { Button } from "../button/button.js";

static override dependencies = [Button];

render() {
  const button = this.tagFor(Button);
  return html`<${button} part="close-button">Close</${button}>`;
}
```

- `tagFor()` donne la balise de l'enregistrement de cet élément : `u-modal` rend `u-button`, `acme-modal` rend la surcharge de la marque.
- N'écrivez jamais la balise d'un autre composant en dur, et n'appelez jamais `document.createElement` pour lui. La surcharge de la marque serait ignorée.
- Une icône se rend de la même façon, avec `Icon` dans `dependencies` (skill `icons`).
- Quand le sous-élément est un choix d'intégration, préférez un slot. La modale rend son bouton de fermeture (`tagFor(Button)`) et reçoit son déclencheur par le slot `trigger`.
- Ajoutez tout nouvel import `lit/...` à `optimizeDeps.include` dans le `vite.config.ts` de la racine. Sinon, Vitest et Storybook ré-optimisent en cours de test et échouent.

## Événements

- Créez une sous-classe d'`Event` typée par événement, dans `packages/components/src/events/<composant>-<événement>.ts`, sur le modèle de `packages/components/src/events/modal-close.ts`.
- Nommez l'événement `u-<événement>`, quel que soit le préfixe de la marque. Fixez ses `bubbles` et `composed`, et complétez `GlobalEventHandlersEventMap`.
- Émettez-le avec `this.dispatchEvent(new ModalCloseEvent())`, documentez-le avec `@fires` et exportez-le depuis `packages/components/src/index.ts`.
- Créez un événement seulement s'il n'existe pas d'événement natif. Un `click` qui sort du shadow root depuis un `<button>` est l'événement du composant : documentez-le avec `@fires click`.
- Un composant désactivé ne laisse sortir aucun événement natif (`ButtonBase.handleClick`).

## ElementInternals, formulaires, états

- Passez par `withInternals()` (`this.internals`). N'appelez jamais `attachInternals()` vous-même : le second appel lève une erreur.
- Composant associé à un formulaire : `static formAssociated = true` (voir `button.ts`).
- Avec `withDisabled`, rendez et gérez les interactions à partir de `this.isDisabled`, pas de `this.disabled`.
- `this.internals` et `this.customStates` sont `protected` : jamais exposés à l'application.
- Les détails des deux mixins sont dans `docs/reference/mixins.mdx`.

## Extension par les marques

L'API publique est ce que la JSDoc documente : propriétés, attributs, slots, parts, tokens, événements et membres `protected` documentés.

- Gardez `protected` et documentés les helpers qu'une marque peut surcharger (`ButtonBase.handleClick`). Le reste est `private` ou `#private`.
- Découpez `render()` en parties `protected` documentées quand une marque doit changer une région.
- Renommer ou retirer un élément public est une rupture pour les marques.

## Accessibilité

- Utilisez d'abord les éléments natifs : `<button>`, `<a>`, `<dialog>`.
- Ajoutez rôles et ARIA là où la sémantique native ne suffit pas. `alert.ts` associe chaque type à `role="alert"` ou `"status"`.
- Ne donnez jamais à un élément le rôle d'un autre : un lien reste un lien.
- Un composant qui enveloppe un contrôle natif lui délègue le focus : `static shadowRootOptions = { ...super.shadowRootOptions, delegatesFocus: true }` (voir `button-base.ts`).
- Une boîte de dialogue a un nom accessible (`label` de la modale).
- Une région live existe avant son contenu : `alert` révèle son message 100 ms après son premier rendu.
- N'écrivez aucun texte visible en dur dans un template : une propriété avec une valeur par défaut (`closeLabel`) ou un slot.
- Les stories lancent l'addon a11y : une violation fait échouer le test.

## Support navigateurs

Vérifiez toute API récente contre `docs/reference/support-navigateurs.mdx` avant de l'utiliser.

## Vérifiez

```sh
npx tsc -p tsconfig.json --noEmit && npm run lint
npm run analyze && npx vitest run   # manifest, test de contrat, registre, stories dans 3 moteurs
npm run example                     # si vous touchez ce que les marques étendent
```
