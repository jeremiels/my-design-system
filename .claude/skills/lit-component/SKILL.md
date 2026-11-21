---
name: lit-component
description: Écrire ou modifier la classe d'un composant Lit du socle (packages/components/src/components/**/*.ts) ou d'une marque — propriétés, rendu, événements, rendu d'autres composants, ElementInternals, accessibilité, extension par les marques. À charger pour tout changement du TypeScript d'un composant, avec component-styling pour son CSS et component-api-docs pour sa JSDoc.
---

# Classe d'un composant Lit

Les marques étendent les classes du socle et les enregistrent sous leur préfixe (ADR 0001, `docs/adr/0001-architecture-multi-marque.mdx`). Chaque règle de ce skill garde ces extensions fonctionnelles.

Exemples : `packages/components/src/components/alert/alert.ts` (simple), `packages/components/src/bases/button/button-base.ts` et `button.ts` (base partagée, mixins, formulaire), `packages/components/src/components/modal/modal.ts` (rend un autre composant), `examples/acme-design-system/src/components/acme-card/acme-card.ts` (composant de marque).

## Anatomie

```ts
import { property } from "lit/decorators.js";
import { html } from "lit";
import { DSBaseElement } from "../base-element.js";
import alertStyles from "./alert.css" with { type: "css" };
import type { AlertVariant } from "./alert.type.js";

/** …JSDoc de la classe : voir component-api-docs… */
export class Alert extends DSBaseElement {
  static override componentName = "alert";

  /** The intent of the alert: sets its colors, its icon and how assistive technologies announce it. */
  @property({ type: String, reflect: true })
  variant: AlertVariant = "information";

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

- Nommez chaque attribut, propriété et valeur selon `docs/reference/api-des-composants.mdx`.
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
- Rendez un composant de base pour tout contrôle qui en a l'air, jamais son élément natif : `button` (avec `variant="neutral"`, `appearance="plain"`, `label` pour une icône seule, `current`, `popup` et `expanded`), `icon`, `spinner`, `checkbox`, `radio`. S'il lui manque quelque chose, ajoutez-le au composant de base (ADR 0031, `docs/adr/0031-composants-de-base-et-composition.mdx`).
- `packages/components/src/composition.test.ts` échoue sur un `<button>`, une case, un `<svg>` ou une barre de progression natifs, et sur une balise écrite en dur. Une exception va dans sa liste `ALLOWED`, avec sa raison.
- Le contrôle natif d'un composant de base est dans son propre shadow root : un test lit le nom et l'ARIA sur `button.shadowRoot.querySelector("button")`, après `await button.updateComplete`.
- Quand le sous-élément est un choix d'intégration, préférez un slot ou une commande. La modale rend son bouton de fermeture (`tagFor(Button)`). Son déclencheur reste hors d'elle : un bouton avec `commandfor` et `command` (section Commandes).
- Ajoutez tout nouvel import `lit/...` à `optimizeDeps.include` dans le `vite.config.ts` de la racine. Sinon, Vitest et Storybook ré-optimisent en cours de test et échouent.

## Événements

- Créez une sous-classe d'`Event` typée par événement, dans `packages/components/src/events/<composant>-<événement>.ts`, sur le modèle de `packages/components/src/events/modal-close.ts`.
- Nommez l'événement, et fixez ses `bubbles`, `composed` et `cancelable`, selon `docs/reference/api-des-composants.mdx` (section 5). Complétez `GlobalEventHandlersEventMap`.
- Émettez-le avec `this.dispatchEvent(new ModalCloseEvent())`, documentez-le avec `@fires` et exportez-le depuis `packages/components/src/index.ts`.
- Créez un événement seulement s'il n'existe pas d'événement natif. Un `click` qui sort du shadow root depuis un `<button>` est l'événement du composant : documentez-le avec `@fires click`.
- Un composant désactivé ne laisse sortir aucun événement natif (`ButtonBase.handleClick`).

## Commandes

Un bouton contrôle un autre élément sans script : `<u-button commandfor="id" command="--show-modal">` (Invoker Commands, ADR 0008, `docs/adr/0008-commandes.mdx`).

- Un composant qui s'ouvre, se ferme ou bascule reçoit des commandes : créez un `CommandsController` dans son constructeur, et passez-lui une méthode `protected handleCommand()`.
- Nommez ses commandes et leurs méthodes publiques selon `docs/reference/api-des-composants.mdx` (section 6). Le navigateur n'envoie jamais une commande intégrée à un custom element.
- Un composant qui rend un `<button>` natif envoie des commandes : appliquez `withInvoker`.
- Un élément du top layer (`<dialog>`, popover) anime sa sortie avec `closeWithTransition()` (`src/controllers/exit-transition.ts`).
- Un popover attaché à un élément du shadow root (liste, menu, infobulle) s'ouvre avec un `AnchoredPopoverController`. Ajoutez `anchoredPopoverStyles` à `static styles`. Floating UI se charge seul, là où l'ancrage CSS manque : n'importez jamais `@floating-ui/dom` dans un composant.
- Le polyfill se charge seul, à la demande : n'importez jamais `invokers-polyfill` dans un composant.
- Les membres de ces briques sont dans `docs/reference/mixins.mdx` et `docs/reference/controleurs.mdx`.

## ElementInternals, formulaires, états

- Passez par `withInternals()` (`this.internals`). N'appelez jamais `attachInternals()` vous-même : le second appel lève une erreur.
- Contrôle de formulaire (valeur, validité, réinitialisation, `readonly`) : appliquez `withFormControl` sur `withInternals` et `withDisabled`. Un bouton de soumission déclare seulement `static formAssociated = true` (voir `button.ts`).
- Champ de formulaire (libellé, indice, erreur, validation) : étendez `FieldBase` et écrivez seulement `renderControl()`. Le contrat est dans la JSDoc de `packages/components/src/bases/field/field-base.ts`, et `text-field.ts` en est l'exemple.
- Champ dont le contrôle ouvre un popup (autocomplete, select, date picker) : étendez `ComboboxBase` et écrivez `renderCombobox()`, `renderPopup()` et `comboboxControls`. Son état est celui de `comboboxReducer()` : envoyez-lui des événements avec `dispatch()`, ne tenez pas l'ouverture dans un champ. Pour une liste d'options, créez un `ListboxController`. `packages/components/src/bases/editable-combobox/editable-combobox-base.ts` en est l'exemple (ADR 0009, ADR 0010).
- Champ texte qui filtre une liste d'options (autocomplete, combobox) : étendez `EditableComboboxBase`. Surchargez `controlText`, `filterText` et `optionText()` pour séparer le texte de la valeur (voir `combobox.ts`, ADR 0025).
- Case à cocher ou interrupteur, libellé après le contrôle : étendez `ToggleBase` et écrivez `renderIndicator()` (voir `checkbox.ts`). Groupe de choix, contrôle de formulaire de ses enfants : étendez `ChoiceGroupBase` et écrivez `items` et `groupRole` (voir `radio-group.ts`, ADR 0017).
- Champ borné (`min`, `max`, `step`) sur un input natif : étendez `RangeFieldBase` et appelez `renderInput(type)` (voir `number-field.ts`, ADR 0019).
- Champ sans contrôle natif : surchargez `syncValidity()` et appelez `syncValueValidity()`, avec un contrôle natif caché `class="validity-proxy"` pour le message du navigateur (voir `select.ts`).
- Éléments d'un composant composite, un seul arrêt de Tab : créez un `RovingFocusController`. Recherche par saisie : `state/typeahead.ts`.
- Champ qui montre la valeur choisie et ouvre un popup (select, date picker) : étendez `PickerBase` et écrivez `displayText`, `openPicker()` et `renderPopup()` (voir `date-picker.ts`, ADR 0023).
- Popup ancré à un déclencheur (menu, popover, infobulle) : étendez `PopupBase` et écrivez `popup` et `anchor` (voir `menu.ts` et `popover.ts`, ADR 0021 et 0022). Le déclencheur prend `class="trigger"`, le popup `class="popup"`.
- Dialogue modal (modale, tiroir) : étendez `ModalBase`, avec votre feuille (voir `drawer.ts`). Rendez le déclencheur dans le même shadow root que le popup : son ARIA doit l'atteindre.
- Composant fait d'enfants (onglets, groupe, menu) : reconnaissez-les par `instanceof` et déclarez leur classe dans `static dependencies`. Un enfant pose son `role` sur son hôte, et demande un rendu à son parent quand `disabled` ou `value` change.
- Champ d'une ligne : liez `@keydown=${this.submitOnEnter}` au contrôle. Entrée soumet alors le formulaire, comme dans un `<input>` natif.
- Une brique qui vise un élément de `FieldBase` lit son `id` dans `fieldIds` (`fieldIds.label`), jamais dans une chaîne recopiée.
- Rendez une option, une ligne ou une cellule désignée par `aria-activedescendant` dans le shadow root de son contrôle, jamais dans le light DOM ni dans un autre composant.
- Ne séparez pas le libellé du contrôle dans deux shadow roots : un `id` ne traverse pas un shadow root, et `ariaLabelledByElements` ne va que vers l'extérieur. Rendez le `<label>` dans le même arbre que le contrôle (ADR 0007, `docs/adr/0007-champs-de-formulaire.mdx`).
- Avec `withDisabled`, rendez et gérez les interactions à partir de `this.isDisabled`, pas de `this.disabled`.
- `this.internals` et `this.customStates` sont `protected` : jamais exposés à l'application.
- Un état que l'application peut cibler en CSS passe par `this.customStates`, et se documente avec `@cssstate` (`user-invalid` de `FieldBase`). Le composant s'affiche bien sans lui.
- Un bouton de soumission d'un shadow root n'a pas de formulaire : `Button` soumet par un `<button>` natif masqué, qui porte son `name` et sa `value`.
- Les détails des deux mixins sont dans `docs/reference/mixins.mdx`.

## Extension par les marques

L'API publique est ce que la JSDoc documente : propriétés, attributs, slots, parts, tokens, événements et membres `protected` documentés.

- Gardez `protected` et documentés les helpers qu'une marque peut surcharger (`ButtonBase.handleClick`). Le reste est `private` ou `#private`.
- Découpez `render()` en parties `protected` documentées quand une marque doit changer une région.
- Un composant qui dépend d'un réglage du design system (ses `icons`) surcharge `static forDesignSystem()`. Il renvoie une sous-classe qui applique le réglage, comme `Icon`. Le registre ne connaît aucun composant par son nom.
- Renommer ou retirer un élément public est une rupture pour les marques.

## Rendu serveur

Une application peut rendre les composants sur un serveur (ADR 0014, `docs/adr/0014-vue-et-rendu-serveur.mdx`). Chaque composant respecte ce contrat :

- Son module s'importe sans DOM. Testez `typeof` avant de lire `CSS`, `document` ou un constructeur d'élément au chargement.
- Son premier rendu dépend de ses propriétés seulement. Il ne lit ni ses enfants, ni le focus, ni un cache rempli par une autre instance.
- Son contenu est lisible sans JavaScript. Un état masqué au premier rendu ne s'applique pas à un élément rendu par un serveur (`alert.ts`).
- Un élément rendu par un serveur a son shadow root dans son constructeur : `this.shadowRoot !== null`. `isServer`, de `lit`, vaut `true` sur le serveur.
- Sur un serveur, seuls le constructeur, `willUpdate()` et `render()` s'exécutent.
- Ajoutez une page du composant à `packages/components/src/ssr.setup.ts`. `npx vitest run --project ssr` la rend et l'hydrate dans trois moteurs.

## Accessibilité

- Utilisez d'abord les éléments natifs : `<button>`, `<a>`, `<dialog>`.
- Ajoutez rôles et ARIA là où la sémantique native ne suffit pas. `alert.ts` associe chaque `variant` à `role="alert"` ou `"status"`.
- Ne donnez jamais à un élément le rôle d'un autre : un lien reste un lien.
- Un composant qui enveloppe un contrôle natif lui délègue le focus : `static shadowRootOptions = { ...super.shadowRootOptions, delegatesFocus: true }` (voir `button-base.ts`).
- Une boîte de dialogue a un nom accessible (`label` de la modale).
- Une région live existe avant son contenu : `alert` révèle son message 100 ms après son premier rendu.
- N'écrivez aucun texte visible en dur dans un template : une propriété avec une valeur par défaut (`closeLabel`) ou un slot.
- Une marque donne ces textes dans sa langue, par nom de propriété : `labels` de `designSystem()`. Nommez donc de la même façon une même propriété dans deux composants (`errorLabel`).
- Un changement que l'utilisateur ne voit pas venir s'annonce dans une région live polie, avec `AnnounceController` : le nombre de suggestions d'`autocomplete` (`ComboboxBase.popupStatus`).
- Un popup se ferme sur Échap, un appui dehors ou la perte du focus avec `DismissController`. Son événement transmet la cause dans `reason`.
- Les stories lancent l'addon a11y : une violation fait échouer le test.

## Support navigateurs

Vérifiez toute API récente contre `docs/reference/support-navigateurs.mdx` avant de l'utiliser.

## Vérifiez

```sh
npx tsc -p tsconfig.json --noEmit && npm run lint
npm run analyze && npx vitest run   # manifest, test de contrat, registre, rendu serveur et stories dans 3 moteurs
npm run example                     # si vous touchez ce que les marques étendent
```
