---
name: component-api-docs
description: Documenter ou changer l'API publique d'un composant ou d'un mixin du socle — JSDoc de la classe et des membres (@element, @slot, @csspart, @tokens, @cssprop, @fires, @internal), manifest généré (custom-elements.json), test de contrat, ruptures pour les marques. À charger dès qu'une propriété, un attribut, un slot, une part, un token, un événement ou un membre protected est ajouté, renommé ou retiré.
---

# API publique d'un composant

L'API publique est déclarée une fois, dans la JSDoc. `npm run analyze` la transforme en `custom-elements.json` (Custom Elements Manifest, ADR 0001, D3 et D5). Ce qui n'est pas documenté est interne.

Ses noms, ses formes et sa part partagée avec Figma suivent `docs/reference/api-des-composants.mdx`.

Le manifest est commité et publié avec le package. Storybook l'affiche (autodocs, controls, panneau Actions). Le manifest d'une marque l'inclut. `packages/components/src/api-contract.test.ts` le compare aux composants rendus.

## JSDoc de la classe

```ts
/**
 * One paragraph: what it is and when to use it.
 *
 * @element u-modal
 * @summary A modal dialog.
 * @slot - The dialog content.
 * @csspart dialog - The native `<dialog>`.
 * @tokens modal - Its tokens, from `@unicorne/tokens` (`src/component/modal/`).
 * @fires {ModalCloseEvent} u-close - When the dialog closes.
 */
```

La JSDoc est en anglais, comme le code.

- `@element` : la balise de l'enregistrement par défaut (`u-…`). Storybook l'associe au `component: "u-…"` des stories. Un composant de marque prend la balise de la marque (`@element acme-card`).
- `@slot` : `-` pour le slot par défaut. Storybook ne liste pas le slot par défaut, mais le manifest et le test de contrat le lisent.
- `@csspart` : chaque `part="…"` du template, et seulement eux.
- `@tokens <groupe>` : le groupe DTCG des tokens du composant. Le plugin `packages/components/plugins/cem-plugin.ts` ajoute chaque token au manifest, avec sa valeur par défaut et sa `$description`. Écrivez la description dans la source DTCG (skill `design-tokens`), et indiquez-y quand une variante ou une taille change la valeur.
- `@cssprop [--nom=défaut] - description` : un token qui ne vient pas d'une source DTCG. Le socle n'en a aucun.
- `@fires {ClasseEvénement} u-événement - description` : l'analyseur ne détecte pas l'émission d'une instance de classe.
- Documentez l'API partagée une fois, sur la classe de base. `ButtonBase` porte le slot, la part, les tokens et l'événement de `u-button` et `u-button-link`. L'analyseur les copie dans les sous-classes, si les mixins sont appliqués dans `extends`.

## Membres

- Écrivez une description d'une ligne par propriété publique. L'initialiseur donne la valeur par défaut : pas de `@default`, pas de `@property {Type} nom`.
- Un membre public pour TypeScript mais hors API reçoit `/** @internal */`. Le manifest l'omet (`Modal.dialog`, `DSBaseElement.tagNames`).
- Un membre `protected` documenté est une API pour les sous-classes : gardez-le stable.
- Les membres d'un mixin sont documentés dans le mixin (`disabled` de `withDisabled`). Ils apparaissent sur chaque composant qui l'applique.

## Procédure

1. Changez le code et sa JSDoc ensemble. Pour un token de composant, changez sa source DTCG et lancez `npm run tokens`.
2. Lancez `npm run analyze`.
3. Relisez le diff de `custom-elements.json` : c'est le diff de l'API. Un élément retiré ou renommé est une rupture pour les marques : propriété, attribut, slot, part, token, événement, membre `protected`.
4. Lancez `npx vitest run`. `packages/components/src/api-contract.test.ts` échoue dans ces cas :
   - le manifest ne documente pas exactement les composants du catalogue ;
   - une part, un slot ou un attribut documenté n'existe pas au rendu ;
   - les tokens documentés diffèrent des tokens déclarés sur `:host`.
5. Commitez le manifest avec le code. En CI, `npm run api:check` échoue sur un manifest périmé.

## Marques

Une marque lance l'analyseur avec `dependencies: true` (`examples/acme-design-system/custom-elements-manifest.config.mjs`). Un composant qui étend le socle est documenté avec ce qu'il hérite. Les composants propres à la marque suivent les mêmes conventions JSDoc, avec la balise et les tokens de la marque. Sa config ajoute `tokensManifest()` de `@unicorne/components/cem-plugin`, avec `emit` limité à ses fichiers : une sous-classe documente les tokens que la marque change, et hérite des autres.
