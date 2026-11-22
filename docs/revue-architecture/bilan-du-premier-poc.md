# Bilan du premier POC du socle `@unicorne/*`

**Date :** 22 novembre 2026 · **Périmètre :** les choix d'architecture et les fonctionnalités du socle, comparés aux grandes bibliothèques de composants. Le code n'est pas revu.

## Statut du premier POC

- Ce dépôt est un premier essai. Il montre ce que le socle peut faire et vers où aller.
- Aucun projet ne le consomme, et il n'a jamais eu vocation à l'être. ACME et l'application Vue sont des fixtures.
- Les ADR 0001 à 0052 datent du 11 au 22 novembre 2026 : onze jours. Les essais réels tiennent en quelques jours.
- Un second POC, sur plusieurs mois, reprend chaque étape. Une designer y mène la partie Figma.

Ce bilan sert d'entrée à ce second POC. Il ne juge pas la maturité du premier : il trie ce qu'il faut garder et ce qu'il faut reprendre.

## Méthode

- **Lecture :** les ADR, la [revue du 16 novembre](rapport.md), `AGENTS.md` et l'inventaire du dépôt.
- **Inventaire :** 56 composants, tous en `status: experimental` dans leur document DSDS. 644 tokens, 11 icônes, 7 packages.
- **Comparaison :**
  - Les bibliothèques qui servent à construire un design system : Lion, React Aria.
  - Les design systems publiés : Spectrum Web Components, Web Awesome (Shoelace), Carbon, Polaris, Vaadin, DSFR.
- **Limite :** les faits sur ces bibliothèques viennent de connaissances existantes. Leurs sources ne sont pas relues ici. Le second POC les revérifie dans les sources, avant chaque ADR.

## Les choix à garder

| Choix                     | Premier POC                                                                                       | Grandes bibliothèques                                                                                  | Avis                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Marque blanche            | Un préfixe par marque, `tagFor()`, `overrides`, les sous-classes rendues partout (ADR 0001, 0012) | Préfixe fixe : `sp-`, `wa-`, `cds-`. Seul Lion est marque blanche, avec des scoped elements            | À garder. Le registre se branche en un seul endroit : passer aux scoped registries reste local |
| Tokens                    | DTCG avec un resolver, trois niveaux, des modifiers, le contraste vérifié en CI (ADR 0002)        | Carbon et Material ont leur propre format. Spectrum a des tokens de composant, sans standard           | À garder : le format suit le standard                                                          |
| Fonctionnalités natives   | `ElementInternals`, `<dialog>`, popover, invokers, anchor positioning et leur repli à la demande  | Web Awesome 3 suit la même voie. Spectrum et Carbon sont plus anciens                                  | À garder                                                                                       |
| Thème par zone            | `[data-theme]` et `[data-brand]` sur tout conteneur, avec des `@layer` (ADR 0013)                 | L'élément `sp-theme`, les zones de Carbon, les classes de Web Awesome                                  | À garder                                                                                       |
| Rendu serveur             | Le contrat Lit SSR et l'hydratation, testés dans trois moteurs (ADR 0014)                         | Rarement testé : ni Shoelace, ni Spectrum, ni Lion                                                     | À garder                                                                                       |
| État sans DOM             | `src/state/` en fonctions pures, testées dans Node (ADR 0010)                                     | React Aria sépare l'état, les hooks et les composants. Les bibliothèques de web components le font peu | À garder : c'est la part la plus réutilisable                                                  |
| Documentation pour agents | CEM, DSDS, la CLI, le serveur MCP, `check --fix` sur le markup et le CSS (ADR 0039 à 0051)        | Polaris a `stylelint-polaris` et des codemods. Carbon a un plugin stylelint pour ses tokens            | À garder. L'idée tient ; son étendue est à reprendre (point 7)                                 |
| Décisions écrites         | Un ADR par choix, avec un benchmark sourcé                                                        | Rarement aussi explicite                                                                               | À garder, en moins grand nombre (point 8)                                                      |

## Les points à reprendre

### 1. La surface publique

- Le niveau 3 d'extension rend publics les membres `protected` (ADR 0001, D3).
- Les 644 tokens sont publics, tokens de composant compris. Les parts, slots et événements de 56 composants aussi.
- `api-diff`, Changesets et les dépréciations sont reportés (ADR 0015).
- Lion montre le coût du niveau 3 : une API de sous-classe fige les internes. Spectrum et Web Awesome s'en tiennent aux tokens, aux parts et aux slots.

**À reprendre :** partir d'une surface minimale. Rendre public un membre `protected` seulement quand une marque en a besoin. Choisir les tokens de composant publics. Mettre `api-diff` en place dès le premier composant.

### 2. L'étendue avant la profondeur

- 56 composants existent, en onze jours.
- Aucun test au lecteur d'écran n'est fait : seul le [protocole](../guides/tests-lecteurs-ecran.mdx) existe.
- Aucune régression visuelle n'est testée.
- L'ADR 0004 est accepté, mais aucun fichier Swift ni Kotlin n'est généré. Code Connect attend (ADR 0016, proposé).

**À reprendre :** peu de composants, menés au bout, avec la designer. Un composant est fini quand il a son composant Figma, ses tests au lecteur d'écran et sa régression visuelle.

### 3. La densité et les tailles

- Seuls `button` et `spinner` ont une taille (`button-size`, `spinner-size`).
- Aucun champ n'a de taille. Aucune densité n'existe pour une page.
- Carbon a des tailles de champ. Spectrum a une échelle `medium` et `large`. Fluent et Vaadin ont un mode compact.

**À reprendre :** décider avec la designer d'un modifier `density`, au niveau sémantique, comme `theme`. Il correspond à un mode de variables Figma.

### 4. Les composants de mise en page

- Le socle n'a ni pile, ni grille, ni `card`, ni `skeleton`, ni état vide.
- Polaris a `BlockStack` et `InlineStack`. Web Awesome a `wa-stack`, `wa-cluster` et `wa-grid`.
- Sans eux, chaque application écrit ses propres règles de mise en page.
- A2UI a `Row` et `Column`, sans équivalent public dans le socle (`packages/a2ui/src/mappings.ts`).

**À reprendre :** définir les composants ou les classes de mise en page avec la designer. Ils correspondent à l'auto layout de Figma.

### 5. Les langues

- Une marque donne ses textes par `designSystem({ labels })` (`examples/acme-design-system/src/brand.ts`). Une marque a une seule langue.
- Web Awesome, Lion et Spectrum choisissent leurs traductions selon le `lang` le plus proche.
- `DSBaseElement` lit déjà ce `lang` pour `Intl` (`packages/components/src/bases/base-element.ts`).

**À reprendre :** décider si une application de la DSI a plusieurs langues. Si oui, indexer `labels` par langue.

### 6. La grille de données

- Le socle n'a pas de grille de données, par choix. `table` n'a pas de virtualisation (ADR 0030).
- Les back-offices de la DSI ont besoin d'une grille : Carbon et Vaadin en ont une.

**À reprendre :** choisir une grille externe et la thémer avec les tokens, plutôt que la construire. Écrire le guide d'intégration.

### 7. Les outils autour des composants

- La CLI, le serveur MCP, A2UI et le site de documentation (ADR 0041, proposé) précèdent tout usage réel.
- `@unicorne/a2ui` épingle `@a2ui/web_core` 0.15.0, alors que la spécification change vite.

**À reprendre :** garder ces outils pour quand les composants sont stables. Commencer par le manifest et les documents DSDS : les outils en dépendent.

### 8. Le nombre d'ADR

- 52 ADR en onze jours. Plusieurs en amendent d'autres : 0001 par 0006 et 0008, par exemple.
- Le fait en vigueur est dispersé entre les ADR.

**À reprendre :** un ADR par décision structurante seulement. Ce qui est en vigueur va dans la référence, en particulier dans le guide d'API des composants.

## Ce que change le travail avec la designer

| Sujet                     | Premier POC                                                            | À décider dans le second POC                                                      |
| ------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Source des tokens         | Git est la source. Figma reçoit les tokens après le merge (ADR 0004)   | Revoir ce choix avec la designer, sur son flux de travail réel                    |
| Noms partagés             | ADR 0016, proposé : les mêmes noms de propriétés dans le code et Figma | Fixer les noms d'abord, puis construire chaque composant des deux côtés à la fois |
| Modifiers et modes Figma  | `theme`, `motion` et les variantes de composant                        | Faire correspondre chaque modifier à un mode, densité comprise (point 3)          |
| Mise en page              | Aucun composant de mise en page                                        | Partir de l'auto layout de Figma (point 4)                                        |
| Validation d'un composant | Les tests et axe                                                       | Ajouter la relecture de la designer et la comparaison avec le composant Figma     |

## Ordre proposé pour le second POC

1. Fixer avec la designer la source des tokens, les noms partagés et les modes Figma.
2. Fixer le guide d'API et une surface publique minimale, avec `api-diff`.
3. Construire les composants de base et de mise en page, menés au bout (point 2).
4. Ajouter la densité, puis les composants composites, un à la fois.
5. Ajouter les outils de documentation quand le manifest est stable.
