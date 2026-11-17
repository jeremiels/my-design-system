# Revue d'architecture du socle `@unicorne/*`

**Date :** 16 novembre 2026 · **Périmètre :** `@unicorne/tokens`, `@unicorne/icons`, `@unicorne/components`, la marque ACME et l'application Vue d'exemple.

Les décisions proposées sont dans les ADR 0010 à 0015 (`docs/adr/`). Le chemin est dans [plan-de-migration.md](plan-de-migration.md).

## Résumé

**Verdict.** Le socle est sain pour une marque sur une page, rendue côté client. Il ne tient pas encore trois besoins confirmés : le thème par conteneur, le rendu serveur et la publication versionnée.

1. **Thèmes et marques par conteneur ([ADR 0013](../adr/0013-portees-de-marque-et-de-theme.mdx)).** `data-theme` n'agit que sur `<html>`. Une marque invitée recharge les tokens du socle et hérite des valeurs de la marque hôte.
2. **Rendu serveur optionnel ([ADR 0014](../adr/0014-vue-et-rendu-serveur.mdx)).** Importer le socle dans Node lève `CSSStyleSheet is not defined`. Avec un correctif, 7 composants sur 8 s'hydratent sans erreur dans les trois moteurs.
3. **Versions et contrat d'API ([ADR 0015](../adr/0015-versions-et-contrat-api.mdx)).** `api:check` vérifie la fraîcheur du manifest, pas les ruptures. Les peer dependencies valent `^0.0.0`.
4. **État, contrôleurs et mixins ([ADR 0010](../adr/0010-etat-controleurs-et-mixins.mdx)).** Pas de Zag.js : son combobox pèse 29,4 kB gzip, contre 7,0 kB pour `autocomplete`. L'état des composants composites passe dans des fonctions pures.
5. **Matrice ([ADR 0011](../adr/0011-matrice-navigateurs.mdx)).** La monter supprime peu de code : les replis se chargent à la demande. La décision attend les statistiques de Courses U et la fin de Firefox ESR 115, en mars 2027.

Le registre à préfixes est confirmé ([ADR 0012](../adr/0012-coexistence-des-enregistrements.mdx)) : les scoped registries excluent 14,6 points de public en France.

## Méthode

- **Lecture :** les 9 ADR, les skills, la référence, le code des trois packages et des deux exemples.
- **Exécution :** Node 26.13.1 et npm 11.20.0, par nvm. `node_modules` était absent : `npm ci` l'a créé.
- **Recherche :** chaque fait sur l'industrie vient d'une source consultée le 16 novembre 2026, listée en fin de page.
- **Essais :** quatre essais dans un dossier temporaire, hors du dépôt. Ils sont décrits dans les axes 1, 3, 6 et 9.
- **Fichiers :** aucun fichier suivi par git n'a changé.

Chaque axe sépare trois niveaux :

- **Faits :** vérifiés dans le dépôt ou dans une source.
- **Analyse :** déduite des faits.
- **Opinion :** un jugement, avec son niveau de confiance.

## Cartographie

### Couches

| Couche              | Contenu                                                                       | Emplacement                                                                 |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Tokens              | Sources DTCG à trois niveaux, un resolver (3 sets, 5 modifiers), 234 tokens   | `packages/tokens/src/`                                                      |
| Feuilles générées   | `tokens.css` (couche `u.tokens.base`) et 7 feuilles `:host`                   | `packages/tokens/css/`, `packages/components/src/components/*/*.tokens.css` |
| Icônes              | 5 icônes, un module par icône, chargé par `import()`                          | `packages/icons/`                                                           |
| Classe de base      | `DSBaseElement` : styles de base, `componentName`, `dependencies`, `tagFor()` | `packages/components/src/components/base-element.ts`                        |
| Bases de famille    | `ButtonBase`, `FieldBase`, `ComboboxBase`                                     | `src/components/button/`, `field/`, `combobox/`                             |
| Mixins              | 7 mixins `withX`                                                              | `src/mixins/`                                                               |
| Composants          | 8 composants                                                                  | `src/components/`                                                           |
| Registre            | `defineComponents()`, `designSystem()`, `allComponents`                       | `src/registry/`                                                             |
| Polyfills           | `invokers-polyfill` et Floating UI, chargés par `import()`                    | `src/polyfills/`                                                            |
| Feuilles de la page | `styles.css` (ordre des couches, utilitaires), `reset.css`                    | `src/styles/`                                                               |

### Dépendances et fuites

| Fuite                                                                                       | Preuve                                                                                                            |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `withListbox` nomme sa liste par l'`id` `label` de `FieldBase`                              | `packages/components/src/mixins/withListbox.ts:141`, `packages/components/src/components/field/field-base.ts:263` |
| `ComboboxBase` renvoie l'`id` `listbox` d'un mixin qu'il n'applique pas                     | `packages/components/src/components/combobox/combobox-base.ts:95`                                                 |
| `ComboboxBase` et `Modal` lisent les attributs `data-open` et `data-closing` de deux mixins | `combobox-base.ts:193`, `packages/components/src/components/modal/modal.ts:245`                                   |
| Le registre connaît le composant `icon` par son nom                                         | `packages/components/src/registry/design-system.ts:147`                                                           |
| Le resolver d'une marque liste les fichiers internes du socle                               | `examples/acme-design-system/tokens/acme.resolver.json:8-12`                                                      |
| L'analyseur du manifest impose la forme des mixins                                          | `.claude/skills/lit-component/SKILL.md` (« jamais par une constante »)                                            |
| Chaque marque recopie `HTMLElementTagNameMap` à la main                                     | `packages/components/src/define.ts:22-33`, `examples/acme-design-system/src/define.ts:21-32`                      |

### Parcours d'une marque

1. La marque écrit son resolver : les fichiers du socle, puis les siens.
2. Terrazzo génère son thème dans la couche `u.tokens.brand`.
3. Elle étend des classes (`AcmeButton extends Button`) et ajoute les siennes (`AcmeCard`).
4. Elle déclare `designSystem({ prefix, catalog, overrides, icons })`.
5. Elle republie le socle par `export * from "@unicorne/components"`.
6. L'application Vue déclare `isCustomElement`, attend `acme.define(…)`, puis monte.

### État mesuré

| Commande          | Résultat                                                           | Durée |
| ----------------- | ------------------------------------------------------------------ | ----- |
| `npm run check`   | Succès : 342 tests (55 Node, 155 Chromium, 44 stories × 3 moteurs) | 34 s  |
| `npm run example` | Succès : ACME, puis l'application Vue                              | 17 s  |
| `npm run compat`  | Succès : `es-check` sur 31 fichiers, `doiuse` sans constat         | 5 s   |

- **Captures d'échecs :** `.vitest/attachments/failure-screenshots/` contient 16 échecs sur 8 fichiers, datés des 13 et 14 novembre. Aucun ne se reproduit sur 4 exécutions complètes.
- **Couverture :** aucune configuration. `@vitest/coverage-v8` refuse le projet `storybook` à trois moteurs. Mesurée sur Chromium seul : 92,2 % des lignes, 82,7 % des branches.
- **Points bas :** `withInternals.ts` 43 %, `css-import-attributes.ts` 69 %, `anchor-positioning.ts` 67 %.

Poids de chaque entrée de `packages/components/dist/`, avec ses chunks partagés. Le `dist/` n'est pas minifié : esbuild minifie ici chaque entrée.

| Entrée                      | Minifié, sans Lit | Gzip, sans Lit | Gzip, avec Lit |
| --------------------------- | ----------------- | -------------- | -------------- |
| `icon`                      | 2,9 kB            | 1,3 kB         | 7,5 kB         |
| `alert`                     | 4,9 kB            | 1,9 kB         | 8,1 kB         |
| `button-link`               | 6,7 kB            | 1,9 kB         | 7,9 kB         |
| `button`                    | 8,5 kB            | 2,5 kB         | 8,4 kB         |
| `text-field`                | 10,6 kB           | 3,4 kB         | 9,8 kB         |
| `textarea`                  | 10,6 kB           | 3,4 kB         | 9,8 kB         |
| `modal`                     | 16,6 kB           | 4,9 kB         | 11,1 kB        |
| `autocomplete`              | 22,4 kB           | 7,0 kB         | 13,3 kB        |
| `define` (catalogue entier) | 41,4 kB           | 11,0 kB        | 17,4 kB        |

| Autre ressource                                     | Gzip   |
| --------------------------------------------------- | ------ |
| Lit seul (`lit`, `decorators.js`, `static-html.js`) | 7,1 kB |
| `tokens.css`                                        | 2,0 kB |
| `styles.css`                                        | 0,2 kB |
| Floating UI, à la demande                           | 8,3 kB |
| `invokers-polyfill`, à la demande                   | 2,0 kB |

## Axe 1 — Couches et machines à états

### Le modèle en trois couches

1. **État :** une fonction sans DOM ni framework. Elle reçoit un état et un événement, et renvoie l'état suivant.
2. **Connexion :** elle relie cet état au DOM, à l'ARIA et aux événements du navigateur.
3. **Composant :** il rend et stylise.

React Spectrum sépare ainsi `react-stately`, `react-aria` et `react-aria-components`. Zag.js sépare une machine, une fonction `connect` et un adaptateur par framework.

Exemple tiré du dépôt. L'état d'`autocomplete` tient aujourd'hui dans six champs, répartis sur quatre fichiers :

| Champ                 | Fichier                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `open`                | `packages/components/src/components/combobox/combobox-base.ts:40`    |
| `activeIndex`         | `packages/components/src/mixins/withListbox.ts:73`                   |
| `#typed`              | `packages/components/src/components/autocomplete/autocomplete.ts:60` |
| `#changed`            | `packages/components/src/components/autocomplete/autocomplete.ts:63` |
| `interacted`, `error` | `packages/components/src/components/field/field-base.ts:104`, `:108` |

Ses transitions sont dispersées. `Autocomplete.willUpdate()` ouvre la liste selon `#typed`, `open`, `value` et le focus du DOM (`autocomplete.ts:115-123`). En trois couches, la même règle devient une fonction testable dans Node :

```ts
// state/combobox.ts : aucune référence au DOM
export function comboboxReducer(state: ComboboxState, event: ComboboxEvent): ComboboxState {
  switch (event.type) {
    case "input":
      return {
        ...state,
        typed: true,
        activeIndex: -1,
        open: event.text !== "" && event.matches > 0,
      };
    case "options":
      return state.typed && state.focused ? { ...state, open: event.matches > 0 } : state;
    case "escape":
      return { ...state, open: false, typed: false, activeIndex: -1 };
  }
}
```

### Faits

- Zag.js 1.48.0 publie des adaptateurs React, Preact, Solid, Vue, Svelte et JavaScript sans framework. Il n'a pas d'adaptateur Lit : `@zag-js/lit` renvoie 404 sur npm.
- La discussion chakra-ui/zag#1210 liste les obstacles dans un shadow root : `getRootNode` à fournir, machines initialisées avant le rendu, bug en mode contrôlé.
- Poids mesuré de Zag.js, machine et `connect`, minifié et gzip : `combobox` 29,4 kB, `select` 28,2 kB, `menu` 29,0 kB, `dialog` 15,5 kB, `date-picker` 37,7 kB. Les quatre premiers ensemble : 50,0 kB.
- `@zag-js/popper` dépend de `@floating-ui/dom` par un import statique. Le socle ne charge Floating UI que là où l'ancrage CSS manque.
- La documentation de Lit conseille un contrôleur, sauf pour une API publique sur le composant ou un accès fin au cycle de vie.
- Spectrum Web Components publie 9 reactive controllers, dont `RovingTabindexController` et `FocusGroupController`.
- Les 155 tests du projet `browser` tournent dans Chromium. Aucun test de logique d'état ne tourne dans Node.
- Chaque mixin duplique ses membres dans une `declare class` et se termine par `as unknown as Constructor<…>` : 7 occurrences dans `src/mixins/`.
- `customStates` de `withInternals` n'a aucun appelant dans `src/` (`packages/components/src/mixins/withInternals.ts:53-70`).

### Analyse

| Composant                                    | Dimensions d'état                         | Profite de trois couches               |
| -------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `button`, `button-link`, `alert`, `icon`     | Aucune ou une                             | Non                                    |
| `text-field`, `textarea`                     | Validation (`interacted`, `error`)        | Peu                                    |
| `modal`                                      | Ouvert, en sortie                         | Peu : le `<dialog>` natif porte l'état |
| `autocomplete`                               | Ouvert, option active, saisie, validation | Oui                                    |
| Select, menu, date picker, onglets (à venir) | Trois ou plus                             | Oui                                    |

- Une bibliothèque coûte 4 fois le poids d'`autocomplete` pour un seul composant, et impose Floating UI à tous les navigateurs.
- Les fonctions `connect` de Zag.js renvoient des sacs de propriétés. Une marque ne surcharge plus `renderOption()` ni `selectOption()` : l'ADR 0001 (D3) perd son niveau 3.
- Un statechart maison complet (états hiérarchiques, parallèles) demande un interpréteur. Aucun composant prévu n'en a besoin.
- Un contrôleur ne peut déclarer ni propriété réactive ni feuille. Les mixins qui portent une API publique restent des mixins.

### Benchmark

| Critère               | Socle           | React Spectrum        | Zag.js, Ark UI            | Spectrum WC           | Lit (documentation)   |
| --------------------- | --------------- | --------------------- | ------------------------- | --------------------- | --------------------- |
| État séparé du DOM    | Non             | Oui : `react-stately` | Oui : machines            | Non vérifié           | Sans objet            |
| Connexion DOM et ARIA | Mixins et bases | Hooks `react-aria`    | `connect` et adaptateur   | Contrôleurs et mixins | Contrôleur par défaut |
| Support de Lit        | Natif           | Non                   | Aucun adaptateur officiel | Natif                 | Natif                 |
| Poids d'un combobox   | 7,0 kB gzip     | Non mesuré            | 29,4 kB gzip              | Non mesuré            | Sans objet            |

### Opinion

- **État pur maison pour les composants composites, statu quo ailleurs.** Confiance : élevée. Les poids sont mesurés, et l'absence d'adaptateur Lit est vérifiée.
- **Contrôleur par défaut, mixin seulement pour une API publique.** Confiance : élevée sur la direction, à confirmer par le pilote. Le gain est la disparition des contrats par `id` et d'une contrainte d'outillage. Trois inconvénients restent : le composant liste lui-même la feuille du contrôleur, il réexpose à la main chaque point d'extension, et les équipes connaissent deux formes.

La décision est dans l'[ADR 0010](../adr/0010-etat-controleurs-et-mixins.mdx).

## Axe 2 — Matrice navigateurs

### Faits revérifiés

| Fonctionnalité                   | Fait des ADR                         | État au 16 novembre 2026                                                                                                    |
| -------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Scoped custom element registries | Chrome 146, Safari 26, Firefox 159   | Confirmé. Baseline « newly available » depuis le 27 octobre 2026                                                            |
| Invoker Commands                 | Chrome 135, Firefox 144, Safari 26.2 | Confirmé. Baseline depuis le 12 décembre 2025                                                                               |
| Reference Target                 | Chrome et Edge 152 seuls             | Confirmé                                                                                                                    |
| CSS anchor positioning           | Chrome 129, Firefox 147, Safari 26   | Confirmé pour `position-area` (MDN : Baseline, janvier 2026). web-features classe le groupe entier en disponibilité limitée |
| Popover API                      | Chrome 114, Firefox 125, Safari 17   | web-features retient Chrome 116 et Safari iOS 18.3 pour le groupe entier                                                    |
| Declarative Shadow DOM           | Non cité                             | Chrome 111, Safari 16.4, Firefox 123 : absent de Firefox ESR 115                                                            |
| `light-dark()`                   | Chrome 123, Firefox 120, Safari 17.5 | Confirmé                                                                                                                    |
| `<select>` personnalisable       | Cité comme remplaçant futur          | Chrome 135, Safari 27, pas Firefox                                                                                          |
| Firefox ESR 115                  | Maintenu jusqu'en mars 2027          | Confirmé : dernière version 115.53.0, avec Firefox 168, le 23 mars 2027                                                     |

Part de public couverte en France, par plancher. Source : `caniuse-lite` 1.0.30001826, installé dans le dépôt.

| Plancher                | Chrome | Firefox | Safari | Couverture | Écart      |
| ----------------------- | ------ | ------- | ------ | ---------- | ---------- |
| Matrice actuelle        | 111    | 115     | 16.4   | 94,53 %    | —          |
| Popover API             | 114    | 125     | 17     | 93,28 %    | −1,25 pt   |
| Firefox ESR 140, iOS 18 | 125    | 140     | 18     | 90,43 %    | −4,10 pts  |
| Ancrage CSS             | 129    | 147     | 26     | 87,14 %    | −7,39 pts  |
| Invoker Commands        | 135    | 144     | 26.2   | 86,13 %    | −8,40 pts  |
| Scoped registries       | 146    | 159     | 26     | 79,96 %    | −14,57 pts |

### Analyse

Ce que chaque plancher supprime :

| Plancher          | Code supprimé                                                                                                             | Dépendance          | Gain pour un navigateur récent                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| Popover API       | La branche sans top layer (`withAnchoredPopover.ts:97`, `:111`, `anchor-positioning.ts:22-24`) et la limite de l'ADR 0009 | Aucune              | Aucun octet                                           |
| Ancrage CSS       | `#follow()` (`withAnchoredPopover.ts:121-156`), `anchor-positioning.ts`, son test                                         | `@floating-ui/dom`  | Aucun octet : le chunk de 8,3 kB ne se télécharge pas |
| Invoker Commands  | `polyfills/invokers.ts`, le repli de `withInvoker.ts` (`:109-131`), son test                                              | `invokers-polyfill` | Aucun octet : le chunk de 2,0 kB ne se télécharge pas |
| Scoped registries | `tagFor()`, les templates statiques                                                                                       | Aucune              | Voir l'axe 4                                          |

- Les replis sont isolés dans deux modules et trois mixins. Le test d'ACME prouve qu'un Chromium récent ne télécharge pas Floating UI.
- Le plancher Popover API apporte le Declarative Shadow DOM natif dans Firefox (123). C'est son vrai gain, pour le rendu serveur.
- Aucun test ne tourne sur les versions minimales. Playwright 1.33 embarque Chromium 113 et WebKit 16.4. Playwright 1.37 embarque Firefox 115.

### Opinion

- **Garder la matrice, dater sa révision.** Confiance : moyenne. Courses U est un site grand public, sans statistiques. Exclure 7 points de public sans donnée est un pari.
- **Tester les planchers à l'exécution** avec d'anciennes versions de Playwright. Confiance : élevée.

La décision est dans l'[ADR 0011](../adr/0011-matrice-navigateurs.mdx).

## Axe 3 — Multi-marques, tokens et theming

### Faits

- Les primitives sont déclarées sur `:root` seul (`packages/tokens/css/tokens.css:3`). Les tokens sémantiques sont déclarés sur `:root` et `[data-brand]` (`tokens.css:108-109`).
- Le thème sombre vise `:root[data-theme="dark"]` et ses `[data-brand]` (`tokens.css:226-227`).
- Essai dans Chromium : un conteneur `data-theme="dark"` dans une page claire garde `--u-color-surface-default: #fff`. Un conteneur `data-theme="light"` dans une page sombre garde `#1b1b1b`.
- L'option `scope` du plugin est un choix de build : `:root` ou un conteneur, pas les deux (`packages/tokens/plugins/terrazzo-plugin.ts:181-183`).
- La feuille d'ACME importe les couches du socle, ses tokens, puis son thème (`examples/acme-design-system/src/styles.css:5-7`). Son `dist/styles.css` pèse 11,9 kB.
- Le lecteur du resolver exige un fichier de tokens entier par `$ref` (`packages/tokens/plugins/dtcg-sources.ts:99`).
- La spec DTCG 2025.10 autorise un `$ref` vers une partie d'un autre document. Elle ne définit aucune extension d'un resolver par un autre.
- Essai avec Terrazzo 2.10 : un `$ref` vers `u.resolver.json#/sets/primitive` échoue. Terrazzo résout mal les chemins relatifs du resolver référencé.
- Le format DTCG définit `$deprecated` sur un token ou un groupe : un booléen ou une explication.
- Spectrum Web Components porte le thème par un élément `sp-theme`, imbriquable : une zone claire dans une page sombre.
- Carbon documente des sections dans le thème opposé (« inline theming »).
- Web Awesome applique ses classes de thème sur `<html>`.

### Analyse

Trois cas sont confirmés par le demandeur :

| Cas                                                     | État                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Une carte produit d'une marque dans la page d'une autre | Possible avec `scope`, mais la marque invitée publie une seule feuille, complète, qui recharge les tokens du socle |
| Un thème différent pour `<main>` et pour la navigation  | Impossible : `data-theme` n'agit que sur `<html>`                                                                  |
| Un thème d'opération sur une page                       | Possible comme une marque limitée à un conteneur, avec les mêmes limites                                           |

- Une marque invitée hérite des primitives que la marque hôte change. Seuls les tokens sémantiques repartent du conteneur.
- Deux marques construites sur deux versions de `@unicorne/tokens` chargent deux fois `u.tokens.base`. Le dernier bloc gagne sur `:root`.
- La règle « un token de composant est un alias de token sémantique » tient : aucun composant ne la contourne, et `checkLevels()` la vérifie.
- Sans collections étendues, Figma ne décline pas un fichier partagé. Git reste la source (ADR 0004, D2) : chaque marque reçoit ses variables par import.

### Benchmark

| Critère                | Socle                               | Spectrum WC              | Carbon WC               | Web Awesome                          | Material Web   |
| ---------------------- | ----------------------------------- | ------------------------ | ----------------------- | ------------------------------------ | -------------- |
| Thème sur un conteneur | Marque : oui. Clair ou sombre : non | Oui, `sp-theme` imbriqué | Oui, « inline theming » | Classes sur `<html>` (documentation) | En maintenance |
| Préfixe des tokens     | `--u-`, commun aux marques          | `--spectrum-` (ADR 0001) | Non vérifié             | Non vérifié                          | Non vérifié    |
| Source des tokens      | DTCG 2025.10, Terrazzo              | Non vérifié              | Sass (`@carbon/styles`) | Non vérifié                          | Non vérifié    |

### Opinion

- **Thème de marque toujours limité à `[data-brand="…"]`, primitives réinitialisées à chaque conteneur de marque, `data-theme` sur tout conteneur.** Confiance : élevée sur le besoin, moyenne sur la forme des sélecteurs.
- **Le triple emboîtement de thèmes reste hors de portée** sans `light-dark()` ou `@scope`. Confiance : élevée.

La décision est dans l'[ADR 0013](../adr/0013-portees-de-marque-et-de-theme.mdx).

## Axe 4 — Extensibilité par les marques

### Faits

- `defineComponents()` enregistre le catalogue en 1,0 ms dans Chromium. Un second préfixe prend 0,4 ms.
- Un second enregistrement du même préfixe garde les balises définies et avertit (`packages/components/src/registry/define-components.ts:157-164`). L'avertissement ne cite aucune version.
- Les scoped registries sont Baseline « newly available » depuis le 27 octobre 2026. Leur plancher couvre 79,96 % du public en France.
- Lion ne charge plus le polyfill des scoped registries depuis avril 2022. Il le réserve à deux versions majeures côte à côte.
- Porsche Design System donne un préfixe par instance ou par version. Son chargeur refuse un préfixe déjà pris par une autre version.
- Spectrum Web Components publie une classe (`./src/Button.js`) et un module d'enregistrement à préfixe fixe (`./sp-button.js`).
- Fluent UI Web Components publie `class.js`, `definition.js`, `template.js`, `styles.js` et `define.js` par composant.
- Le manifest liste 57 entrées `protected`, mixins et interfaces compris. Le test de contrat ne lit ni `privacy` ni membre `protected`.
- Les événements s'appellent `u-*` pour toute marque (`packages/components/src/events/modal-close.ts:17`). L'ADR 0001 le décide dans ses questions tranchées.

### Analyse

- Deux design systems sur une page fonctionnent : chaque préfixe a ses balises et ses surcharges.
- Deux versions d'une même marque se replient sur la première chargée. Une application ne peut pas choisir un autre préfixe : `designSystem()` le fixe.
- Les événements `u-*` ne sont pas un défaut. Un nom d'événement n'est pas une ressource globale, et il reste identique d'une marque à l'autre, comme `--u-`.
- `tagFor()` garde la migration vers les scoped registries localisée, comme le prévoit l'ADR 0001 (D2).

### Benchmark

| Critère                    | Socle                    | Spectrum WC | Web Awesome      | Fluent WC                        | Porsche                | Lion                        |
| -------------------------- | ------------------------ | ----------- | ---------------- | -------------------------------- | ---------------------- | --------------------------- |
| Préfixe des balises        | Libre, par marque        | Fixe, `sp-` | `wa-` (ADR 0009) | Par définition (`definition.js`) | Libre, par instance    | Scoped elements             |
| Classe sans enregistrement | Oui                      | Oui         | Non vérifié      | Oui                              | Non vérifié            | Non vérifié                 |
| Deux versions sur une page | Repli sur la première    | Non vérifié | Non vérifié      | Non vérifié                      | Un préfixe par version | Polyfill de scoped registry |
| Extension par sous-classe  | Oui, membres `protected` | Non vérifié | Non vérifié      | Oui, `base.js`                   | Non vérifié            | Oui (ADR 0001)              |

### Opinion

- **Garder `tagFor()` et les préfixes.** Confiance : élevée.
- **Donner à l'application le choix du préfixe, et tracer les versions à l'enregistrement.** Confiance : moyenne : le besoin de deux versions d'une même marque n'est pas confirmé.

La décision est dans l'[ADR 0012](../adr/0012-coexistence-des-enregistrements.mdx).

## Axe 5 — Accessibilité

### Faits

- Le RGAA en vigueur est la version 4.1.2. Une version 5 est annoncée pour la fin de 2026.
- L'APG demande `aria-selected="true"` sur l'option désignée, et le focus du DOM sur le combobox. `withListbox` le fait (`withListbox.ts:154`).
- Reference Target n'existe que dans Chrome et Edge 152. `FieldBase` garde le libellé et le contrôle dans le même shadow root (ADR 0007).
- `autocomplete` n'annonce ni le nombre de suggestions ni l'absence de résultat (ADR 0009, questions ouvertes).
- Entrée dans un champ du socle ne soumet pas le formulaire (ADR 0009, questions ouvertes).
- `u-button type="submit"` appelle `requestSubmit()` sans élément déclencheur (`packages/components/src/components/button/button.ts:49`).
- Deux textes par défaut sont en anglais : `Error:` (`field-base.ts:100`) et `Close` (`modal.ts:74`). L'application Vue répète `error-label="Erreur :"` sur 3 champs.
- Un champ `required` n'a aucune indication visible : ni `field-base.css` ni le template n'en rendent.
- `modal` porte son nom par `aria-label` seul (`modal.ts:155`).
- Les stories échouent sur toute violation axe, dans trois moteurs (`.storybook/preview.ts:50`).
- Aucune page, aucun skill ne cite un test avec un lecteur d'écran.

### Analyse

| Constat                                                                               | Critère                                   | Gravité                             |
| ------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| Pas de message d'état pour les suggestions                                            | WCAG 4.1.3 (AA)                           | Importante                          |
| Pas de soumission implicite                                                           | Comportement attendu d'un formulaire HTML | Importante                          |
| Textes par défaut en anglais                                                          | WCAG 3.1.2 si la page est en français     | Importante                          |
| Bouton `submit` sans déclencheur : son `name` et sa `value` manquent dans les données | Parité avec `<button>`                    | Moyenne                             |
| Champ obligatoire sans indication visible                                             | RGAA 11.10                                | Moyenne : le libellé peut la porter |
| Nom de la modale séparé de son titre visible                                          | WCAG 2.5.3                                | Faible                              |

- axe ne détecte ni l'ordre de lecture, ni les annonces, ni la qualité des noms. Les composants composites demandent des tests manuels.
- Le format DSDS a un champ `checkedBy`. Il peut tracer un test manuel par règle.

### Benchmark

| Critère                     | Socle                                               | Web Awesome                           | Spectrum WC                           | Lion                                 | DSFR                                    |
| --------------------------- | --------------------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------ | --------------------------------------- |
| Option active d'un combobox | Copies dans le shadow root, `aria-activedescendant` | Live region (ADR 0009)                | Copies dans le shadow root (ADR 0009) | Options dans le light DOM (ADR 0009) | Pas de web components : HTML, CSS et JS |
| Localisation des textes     | Une propriété par instance                          | Dépendance `@shoelace-style/localize` | `LanguageResolutionController`        | Non vérifié                          | Non vérifié                             |
| Outil d'audit dans le dépôt | axe sur les stories                                 | Non vérifié                           | Non vérifié                           | Non vérifié                          | `pa11y` en devDependency                |

### Opinion

- **Ajouter une live region à `ComboboxBase`, la soumission implicite à `FieldBase`, et des libellés par enregistrement.** Confiance : élevée.
- **Tracer les tests manuels dans DSDS**, sur quatre couples : NVDA et Firefox, JAWS et Chrome, VoiceOver et Safari, TalkBack et Chrome. Confiance : moyenne : le choix des couples dépend du public de Courses U.

Ces constats n'ont pas d'ADR : ils corrigent des composants, sans changer l'architecture.

## Axe 6 — Vue et rendu serveur

### Faits sur Vue

- L'application déclare `isCustomElement` à la main (`examples/acme-vue-app/vite.config.ts:12`).
- `v-model` fonctionne sur `value` et `input` : le test de l'application le prouve sur 5 champs.
- `vue-tsc` ne vérifie ni les propriétés ni les événements des balises `acme-*`. Aucun `GlobalComponents` n'est déclaré.
- Le guide de Vue recommande d'étendre `GlobalComponents` avec un type d'aide. Il déconseille d'exporter ces types depuis l'entrée principale.
- Essai : un type à gabarit dérive `HTMLElementTagNameMap` et `GlobalComponents` d'un seul type de catalogue, pour tout préfixe. `tsc` 6 l'accepte.
- Porsche publie un package de wrappers, `@porsche-design-system/components-vue`. Web Awesome publie des types JSX et un fichier `web-types`.

### Faits sur le rendu serveur

Essai avec `@lit-labs/ssr` 4.1.0, `lit` 3.3.3 et les archives du socle :

| Étape                                                                                     | Résultat                                                                                                              |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Importer `@unicorne/components` dans Node                                                 | Échec : `CSSStyleSheet is not defined` (`dist/decorate-*.js:5`, généré par `css-import-attributes.ts:202`)            |
| Même import, après `globalThis.CSSStyleSheet = CSSStyleSheet` de `@lit-labs/ssr-dom-shim` | Succès                                                                                                                |
| Rendre les 8 composants                                                                   | Succès : Declarative Shadow DOM, styles compris, composants imbriqués compris (`u-modal` rend `u-button` et `u-icon`) |
| Hydrater dans Chromium, Firefox et WebKit                                                 | 7 composants sur 8 sans erreur                                                                                        |
| Hydrater `u-autocomplete` avec des enfants `<option>`                                     | Échec : `unexpected longer than expected iterable`. Dans Firefox et WebKit, la liste reste vide                       |
| Afficher `u-alert` sans JavaScript                                                        | Invisible : `.alert--pending` vaut `opacity: 0` (`alert.css:22`) jusqu'à `revealed` (`alert.ts:67`)                   |
| Rendre `u-icon`                                                                           | Vide : le module de l'icône se charge par `import()`                                                                  |

- La cause de l'échec d'`autocomplete` : `withListbox` lit les enfants dans `connectedCallback()` (`withListbox.ts:78-80`), que le serveur n'appelle pas.
- Chaque instance répète ses styles. Un `u-button` rendu pèse 4,2 kB, dont 3,8 kB de CSS. 50 boutons pèsent 206 kB, 2,5 kB en gzip.
- `@lit-labs/ssr` appartient à Lit Labs : un package expérimental. Le travail asynchrone n'y est pas pris en charge.
- `nuxt-ssr-lit` 2.0.0 est un module communautaire pour Nuxt 3. Il enveloppe les balises d'un préfixe et les rend avec `@lit-labs/ssr`.
- Web Awesome 3.14.0 dépend de `@lit-labs/ssr` et publie `./dist/ssr/*`.

### Analyse

- L'échec d'import touche aussi une application Nuxt qui ne rend pas les composants côté serveur. Tout import universel de la marque casse.
- Le correctif est local au plugin : la feuille compilée peut devenir un `CSSResult` de Lit, que le serveur sait rendre. Essai : un composant dont la feuille est un `unsafeCSS(…)` s'importe dans Node et rend ses styles.
- `tagFor()`, les templates statiques et les sous-classes de `defineComponents()` fonctionnent au rendu serveur et à l'hydratation.
- Le rendu serveur reste une option : aucune entrée principale n'a besoin d'importer `@lit-labs/ssr`.

### Benchmark

| Critère        | Socle                       | Web Awesome            | Porsche      | Spectrum WC |
| -------------- | --------------------------- | ---------------------- | ------------ | ----------- |
| Types pour Vue | Aucun                       | Types JSX, `web-types` | Wrappers Vue | Non vérifié |
| Rendu serveur  | Import impossible dans Node | Entrées `ssr` publiées | Non vérifié  | Non vérifié |

### Opinion

- **Types dérivés d'un catalogue, sans wrapper ni génération.** Confiance : élevée : l'essai compile.
- **Rendu serveur en option, garanti par un contrat et un test d'hydratation.** Confiance : moyenne : `@lit-labs/ssr` est expérimental, et Nuxt n'a pas été essayé.

La décision est dans l'[ADR 0014](../adr/0014-vue-et-rendu-serveur.mdx).

## Axe 7 — Distribution et versions

### Faits

- Les trois packages sont `private`, en version `0.0.0`.
- `@unicorne/components` déclare ses pairs en `^0.0.0` (`packages/components/package.json:90-95`). Cette plage n'accepte que `0.0.0`.
- `api:check` relance l'analyseur et compare avec l'index git (`packages/components/package.json:80`). Il ne compare pas avec une version publiée.
- Chaque cible de la carte `exports` existe dans l'archive de `@unicorne/components` : 28 cibles, 70 fichiers.
- Les archives de `@unicorne/tokens` et de `@unicorne/icons` déclarent la condition `@unicorne/source` vers 4 fichiers absents (`packages/tokens/package.json:20`, `:25`, `:30`, `packages/icons/package.json:22`).
- La marque republie le socle par `export *` (`examples/acme-design-system/src/index.ts:5`).
- Un composant de marque du même nom qu'un composant du socle fait échouer `defineComponents()`. Le guide demande de vérifier le catalogue à chaque mise à jour.
- `publint` et `arethetypeswrong` n'ont pas tourné : l'environnement de la revue a refusé leur téléchargement.

### Analyse

- Sans comparaison avec la dernière version publiée, une rupture passe la CI dès que le manifest est régénéré.
- Un nom ajouté au catalogue du socle peut casser une marque dans une version mineure.
- La condition `@unicorne/source` publiée est inoffensive hors du dépôt : aucune application ne l'active.
- Le `dist/` non minifié est le bon choix pour un package : l'application minifie.

### Benchmark

| Critère             | Socle           | Spectrum WC                  | Carbon WC  | Fluent WC         | Web Awesome |
| ------------------- | --------------- | ---------------------------- | ---------- | ----------------- | ----------- |
| Version publiée     | Aucune          | 1.12.6, commune aux packages | 2.67.0     | 3.2.1             | 3.14.0      |
| Champ `sideEffects` | CSS et `define` | `sp-*.js`                    | Absent     | Modules `define`  | Non vérifié |
| Lit                 | Peer dependency | Non vérifié                  | Dependency | Sans objet (FAST) | Dependency  |
| Floating UI         | À la demande    | Non vérifié                  | Dependency | Sans objet        | Dependency  |

### Opinion

- **Une porte de rupture en CI : comparer le manifest à celui de la dernière version publiée.** Confiance : élevée.
- **Réserver les noms de composants du socle dans une version majeure.** Confiance : moyenne.

La décision est dans l'[ADR 0015](../adr/0015-versions-et-contrat-api.mdx).

## Axe 8 — Qualité et outillage

### Faits

- 342 tests passent. La logique d'état n'a aucun test dans Node.
- La couverture n'est pas mesurable avec la configuration commitée.
- Aucun test ne tourne sur un navigateur de la matrice. La référence le dit (`docs/reference/support-navigateurs.mdx`, section Vérifications).
- `@chromatic-com/storybook` est installé (`package.json:29`, `.storybook/main.ts:6`). La CI n'a aucune étape de régression visuelle.
- `@vitest/browser` installé expose `toMatchScreenshot`.
- DSDS couvre 2 composants sur 8. Sa spec vient d'un dépôt GitHub en version 0.23.1 (`package.json:39`).
- Un composant touche 12 endroits (`.claude/skills/create-component/SKILL.md`). Cinq listes répètent le catalogue : `catalog.ts`, `define.ts`, `index.ts`, `vite.config.ts:29-46`, `package.json:42-73`.
- Le skill `thermo-nuclear-code-quality-review` n'a pas été appliqué : la revue porte sur l'architecture.

### Analyse

- Les 16 captures d'échecs datent du développement des fonctionnalités. Elles ne signalent aucune instabilité.
- Les cinq listes du catalogue peuvent dériver d'une seule. Un test peut comparer `exports` et `lib.entry` à `allComponents`.
- La spec DSDS n'a pas de version 1. Étendre le pilote engage 6 documents sur un format qui peut changer.

### Opinion

- **Ajouter un projet de couverture sur Chromium, un test d'exécution sur les planchers, et des captures par `toMatchScreenshot`.** Confiance : élevée.
- **Garder DSDS en pilote, et y tracer les tests manuels d'accessibilité.** Confiance : moyenne.

## Axe 9 — Performance

### Faits

Mesures dans Chromium sans interface, sur le poste de la revue. Médiane de 7 exécutions.

| Mesure                                  | Script  | Jusqu'au rendu |
| --------------------------------------- | ------- | -------------- |
| Enregistrer le catalogue (8 composants) | 1,0 ms  | —              |
| 1000 `<button>` natifs                  | 1,0 ms  | 32,8 ms        |
| 1000 `LitElement` simples               | 7,1 ms  | 31,7 ms        |
| 1000 `u-button`                         | 17,4 ms | 57,7 ms        |
| 1000 `u-alert`, chacun avec `u-icon`    | 48,4 ms | 96,3 ms        |
| 200 `u-text-field`                      | 7,5 ms  | 32,7 ms        |
| 200 `u-autocomplete`                    | 11,5 ms | 32,2 ms        |

- Un `u-button` adopte 4 feuilles, un `u-autocomplete` 9. Ce sont des feuilles constructibles partagées entre les instances.
- Les deux polyfills ne se téléchargent que là où l'API manque.
- L'application Vue d'exemple livre 100 kB de JavaScript initial, 36,2 kB en gzip, Vue et Lit compris.

### Analyse

- L'enregistrement et les templates statiques ne coûtent rien de mesurable.
- Un `u-button` coûte 2,4 fois un `LitElement` simple. Une liste de 50 produits reste sous 1 ms de script.
- Le seul coût notable est celui du rendu serveur : les styles répétés dans chaque instance (axe 6).

### Opinion

Aucun constat de performance ne demande une décision. Confiance : élevée pour le rendu client, moyenne pour le rendu serveur d'une longue liste.

## Constats par criticité

### Bloquant

Un constat bloquant empêche le socle de passer à l'échelle des marques.

| Id  | Constat                                                                            | Preuve                                                  | Action                                                                    | ADR  |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | ---- |
| B1  | `data-theme` n'agit que sur `<html>`                                               | `tokens.css:226-227`, essai de l'axe 3                  | Émettre les contextes de thème sur `[data-theme]`                         | 0013 |
| B2  | Une marque invitée recharge les tokens du socle et hérite des primitives de l'hôte | `acme-design-system/src/styles.css:5-7`, `tokens.css:3` | Publier `theme.css` seul, réinitialiser les primitives sur `[data-brand]` | 0013 |
| B3  | Le socle ne s'importe pas dans Node                                                | `css-import-attributes.ts:202`, essai de l'axe 6        | Compiler chaque feuille en `CSSResult`                                    | 0014 |
| B4  | Aucune porte de rupture avant publication, pairs en `^0.0.0`                       | `packages/components/package.json:80`, `:90-95`         | `api:diff` contre la version publiée, plages réelles                      | 0015 |

### Important

| Id  | Constat                                                                       | Preuve                                           | Action                                             | ADR  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- | ---- |
| I1  | L'état d'`autocomplete` tient dans 6 champs sur 4 fichiers, liés par des `id` | Axe 1                                            | `state/`, contrôleurs                              | 0010 |
| I2  | `autocomplete` casse à l'hydratation avec des enfants `<option>`              | `withListbox.ts:78-80`                           | Lire les enfants après le premier rendu            | 0014 |
| I3  | `alert` rendu par le serveur est invisible sans JavaScript                    | `alert.css:22`, `alert.ts:67`                    | Révéler d'emblée un contenu rendu par le serveur   | 0014 |
| I4  | Aucun type ne vérifie les balises dans un template Vue                        | `acme-vue-app/vite.config.ts:12`                 | Types dérivés du catalogue                         | 0014 |
| I5  | Pas de message d'état pour les suggestions                                    | ADR 0009, questions ouvertes                     | Live region dans `ComboboxBase`                    | —    |
| I6  | Entrée ne soumet pas le formulaire                                            | ADR 0009, questions ouvertes                     | `requestSubmit()` dans `FieldBase` sur Entrée      | —    |
| I7  | Textes par défaut en anglais, répétés par instance                            | `field-base.ts:100`, `modal.ts:74`               | Option `labels` de `designSystem()`, comme `icons` | —    |
| I8  | Le resolver d'une marque liste les fichiers internes du socle                 | `acme.resolver.json:8-12`, `dtcg-sources.ts:99`  | Générer le resolver de la marque                   | 0013 |
| I9  | Deux versions d'une même marque se replient sans dire lesquelles              | `define-components.ts:157-164`                   | Version tracée, préfixe au choix de l'application  | 0012 |
| I10 | Aucun test sur les planchers de la matrice                                    | `support-navigateurs.mdx`, section Vérifications | Tests d'ACME sous Playwright 1.33 et 1.37          | 0011 |
| I11 | La couverture n'est pas mesurable                                             | Axe 8                                            | Projet de couverture sur Chromium                  | —    |

### Amélioration

| Id  | Constat                                                               | Preuve                            | Action                                                                       |
| --- | --------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| A1  | `customStates` n'a aucun appelant                                     | `withInternals.ts:53-70`          | Le retirer, ou l'utiliser dans `modal`                                       |
| A2  | La condition `@unicorne/source` est publiée vers des fichiers absents | `packages/tokens/package.json:20` | La retirer à l'empaquetage                                                   |
| A3  | Le registre connaît `icon` par son nom                                | `design-system.ts:147`            | Une méthode statique `withDesignSystem()` que `Icon` implémente              |
| A4  | `u-button type="submit"` n'envoie pas de déclencheur                  | `button.ts:49`                    | Soumettre par un `<button>` temporaire du light DOM, ou documenter la limite |
| A5  | Le catalogue est répété dans cinq listes                              | Axe 8                             | Un test compare `exports` et `lib.entry` à `allComponents`                   |
| A6  | Aucune régression visuelle                                            | `ci.yml`                          | `toMatchScreenshot` sur les stories, dans Chromium                           |
| A7  | Un champ obligatoire n'a pas d'indication visible                     | `field-base.ts:263`               | Une règle DSDS, ou une part `required-indicator`                             |
| A8  | La référence date la Popover API à Chrome 114                         | `support-navigateurs.mdx`         | Citer la nuance de web-features : Chrome 116, Safari iOS 18.3                |

## Désaccords avec les conventions

| Convention                                                        | Source                                                                 | Désaccord                                                                         | Proposition                                                            |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| « Un comportement utile à plusieurs composants : un mixin »       | `.claude/skills/lit-mixin/SKILL.md`                                    | Un mixin sans API publique crée de l'héritage, des casts et des contrats par `id` | Contrôleur par défaut, mixin pour une API publique (ADR 0010, D2)      |
| « Appliquez les mixins dans `extends`, jamais par une constante » | `.claude/skills/lit-component/SKILL.md`                                | La règle sert l'analyseur. Elle reste vraie, mais ne concerne plus que 3 mixins   | La garder pour `withDisabled`, `withInternals` et `withInvoker`        |
| L'import `with { type: "css" }` donne un `CSSStyleSheet`          | `docs/reference/tokens-et-couches.mdx`, section Feuille d'un composant | Ce type empêche l'import dans Node                                                | L'écriture reste. Le plugin compile vers un `CSSResult` (ADR 0014, D3) |
| « La matrice change seulement par une décision »                  | `docs/reference/support-navigateurs.mdx`                               | Sans date de révision, la décision n'arrive pas                                   | Une révision datée et un seuil (ADR 0011)                              |
| `scope` choisit `:root` ou un conteneur                           | `docs/reference/tokens-et-couches.mdx`, section Thèmes                 | Une marque publie alors deux feuilles, ou une seule qui ne sert qu'un cas         | Toujours `[data-brand="…"]` (ADR 0013, D1)                             |

Deux conventions contestées en phase 1 sont confirmées par le benchmark :

- **Événements `u-*` pour toute marque.** Le nom reste stable d'une marque à l'autre.
- **`aria-selected` sur l'option active.** L'APG le demande.

## Limites de la revue

- Nuxt n'a pas été essayé : seul `@lit-labs/ssr` l'a été, dans Node et dans trois navigateurs.
- Les cellules « Non vérifié » des tableaux n'ont pas de source consultée. Elles ne valent pas un « non ».
- Les parts de public viennent de StatCounter, tous sites confondus. Le public de Courses U peut différer.
- Les mesures de performance viennent d'un seul poste, dans un Chromium sans interface.
- Aucun lecteur d'écran n'a été utilisé.
- `publint` et `arethetypeswrong` n'ont pas tourné.

## Sources

Consultées le 16 novembre 2026.

**Plateforme web**

- [Scoped custom element registries](https://web-platform-dx.github.io/web-features-explorer/features/scoped-custom-element-registries/) (web-features explorer) : Chrome et Edge 146, Safari 26, Firefox 159, Baseline depuis le 27 octobre 2026.
- [Invoker commands](https://web-platform-dx.github.io/web-features-explorer/features/invoker-commands/) (web-features explorer) : Chrome 135, Firefox 144, Safari 26.2.
- [Reference target](https://web-platform-dx.github.io/web-features-explorer/features/referencetarget/) (web-features explorer) : Chrome et Edge 152.
- [Anchor positioning](https://web-platform-dx.github.io/web-features-explorer/features/anchor-positioning/) (web-features explorer) : disponibilité limitée pour le groupe entier.
- [position-area](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-area) (MDN) : Baseline depuis janvier 2026.
- [Popover](https://web-platform-dx.github.io/web-features-explorer/features/popover/) (web-features explorer) : Chrome 116, Firefox 125, Safari 17, Safari iOS 18.3.
- [Declarative shadow DOM](https://web-platform-dx.github.io/web-features-explorer/features/declarative-shadow-dom/) (web-features explorer) : Chrome 111, Safari 16.4, Firefox 123.
- [light-dark()](https://web-platform-dx.github.io/web-features-explorer/features/light-dark/) (web-features explorer) : Chrome 123, Firefox 120, Safari 17.5.
- [Customizable select](https://web-platform-dx.github.io/web-features-explorer/features/customizable-select/) (web-features explorer) : Chrome 135, Safari 27.
- [Firefox release calendar](https://whattrainisitnow.com/calendar/) (Mozilla) : ESR 115 jusqu'à 115.53.0, avec Firefox 168, le 23 mars 2027.
- `caniuse-lite` 1.0.30001826 et `browserslist` 4.29.5, installés dans le dépôt : parts de public en France.

**Architectures en couches**

- [Zag.js, introduction](https://zagjs.com/overview/introduction) et [Framework adapters](https://zagjs.com/guides/framework-adapters) (Zag.js) : adaptateurs officiels, contrat d'un adaptateur.
- [@zag-js/combobox](https://registry.npmjs.org/@zag-js/combobox/latest) (npm), version 1.48.0 : dépendances. Poids mesurés avec esbuild.
- [Integration with web components #1210](https://www.github.com/chakra-ui/zag/discussions/1210) (chakra-ui/zag) : obstacles avec Lit et le shadow DOM, de 2024 à 2025.
- [React Spectrum, architecture](https://react-spectrum.adobe.com/architecture.html) et [React Aria Hooks](https://react-aria.adobe.com/hooks) (Adobe) : `react-stately`, `react-aria`, composants.
- [Component composition](https://lit.dev/docs/composition/overview/) (Lit) : contrôleurs et mixins.

**Design systems en web components**

- [@spectrum-web-components/button](https://registry.npmjs.org/@spectrum-web-components/button/latest) (npm), version 1.12.6 : exports, `sideEffects`.
- [Reactive controllers](https://github.com/adobe/spectrum-web-components/tree/main/1st-gen/tools/reactive-controllers) (Adobe) : les 9 contrôleurs.
- [sp-theme](https://opensource.adobe.com/spectrum-web-components/tools/theme/) (Adobe) : thème limité à un sous-arbre, imbriquable.
- [@awesome.me/webawesome](https://registry.npmjs.org/@awesome.me/webawesome/latest) (npm), version 3.14.0 : dépendances, entrées `ssr`.
- [Web Awesome, installation](https://webawesome.com/docs/) et [Themes](https://webawesome.com/docs/themes/) (Web Awesome) : classes de thème sur `<html>`.
- [material-web](https://github.com/material-components/material-web) (Google) : « MWC is in maintenance mode pending new maintainers ».
- [@carbon/web-components](https://registry.npmjs.org/@carbon/web-components/latest) (npm), version 2.67.0 : dépendances, exports.
- [Carbon, themes](https://carbondesignsystem.com/elements/themes/code/) (IBM) : quatre thèmes, « inline theming ».
- [@fluentui/web-components](https://registry.npmjs.org/@fluentui/web-components/latest) (npm), version 3.2.1 : exports par composant.
- [@gouvfr/dsfr](https://registry.npmjs.org/@gouvfr/dsfr/latest) (npm), version 1.15.4 : build Sass, PostCSS et Rollup, sans dépendance d'exécution.
- [Porsche Design System, Vue](https://designsystem.porsche.com/v4/developing/vue/advanced/) (Porsche), version 4.10.1 : préfixe par instance.
- [Loader script](https://designsystem.porsche.com/v4/partials/loader-script) (Porsche Design System, version 4) : refus d'un préfixe déjà enregistré par une autre version.
- [Lion without polyfills](https://lion.js.org/blog/lion-without-polyfills/) (ING, 5 avril 2022) : polyfill des scoped registries optionnel.
- [Scoped elements](https://open-wc.org/docs/development/scoped-elements/) (Open Web Components) : polyfill requis.

**Vue et rendu serveur**

- [Vue and Web Components](https://vuejs.org/guide/extras/web-components.html) (Vue) : `isCustomElement`, `GlobalComponents`.
- [Lit SSR, overview](https://lit.dev/docs/ssr/overview/) et [Authoring](https://lit.dev/docs/ssr/authoring/) (Lit) : statut Lit Labs, cycle de vie côté serveur.
- `@lit-labs/ssr` 4.1.0, `@lit-labs/ssr-dom-shim` 1.6.0 et `lit` 3.3.3, installés pour l'essai.
- [nuxt-ssr-lit](https://github.com/prashantpalikhe/nuxt-ssr-lit) (communauté), version 2.0.0 : module Nuxt 3.

**Tokens**

- [Design Tokens Resolver Module 2025.10](https://www.designtokens.org/tr/2025.10/resolver/) (DTCG) : cibles de `$ref`.
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/) (DTCG) : `$deprecated`.

**Accessibilité et tests**

- [Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (W3C, APG) : `aria-selected`, focus, clavier.
- [RGAA](https://accessibilite.numerique.gouv.fr/) (DINUM) : version 4.1.2, version 5 annoncée pour la fin de 2026.
- [Playwright release notes](https://playwright.dev/docs/release-notes) (Microsoft) : navigateurs des versions 1.32 à 1.40.
