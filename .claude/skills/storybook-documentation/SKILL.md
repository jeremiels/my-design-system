---
name: storybook-documentation
description: Écrire, réécrire ou relire la documentation du socle — pages MDX de Storybook (docs/**), AGENTS.md, skills (.claude/skills/) — selon la charte de rédaction (un type par page, phrases courtes, présent). À charger pour toute page, tout tableau, tout lien entre pages et toute modification d'un skill ou d'AGENTS.md.
---

# Documentation

## 1. Préparez

1. Lisez la charte : `docs/reference/charte-de-redaction.mdx`. Elle fixe les règles et le glossaire.
2. Choisissez le type de la page : tutoriel, guide, référence, explication ou ADR. Un contenu de deux types va dans deux pages liées.
3. Cherchez si le fait existe déjà : `grep -rn "<terme>" docs .claude/skills AGENTS.md`. S'il existe, mettez un lien vers lui.

## 2. Écrivez une page MDX

Storybook charge les pages `docs/**/*.mdx` et les stories `packages/*/src/**/*.stories.ts` (`.storybook/main.ts`). Il compile le MDX sans `remark-gfm` : le CommonMark fonctionne, les extensions GitHub non.

```mdx
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Documentation/Référence/Support navigateurs" />

# Support navigateurs
```

| Type        | Titre                              | Dossier                 |
| ----------- | ---------------------------------- | ----------------------- |
| Tutoriel    | `Documentation/Premiers pas`       | `docs/premiers-pas.mdx` |
| Guide       | `Documentation/Guides/<Nom>`       | `docs/guides/`          |
| Référence   | `Documentation/Référence/<Nom>`    | `docs/reference/`       |
| Explication | `Documentation/Explication/<Nom>`  | `docs/explication/`     |
| Décision    | `Documentation/ADR/<numéro> <Nom>` | `docs/adr/`             |

- `storySort` (`.storybook/preview.ts`) fixe l'ordre de ces dossiers.
- Un lien vers une page utilise son id : `[Support navigateurs](?path=/docs/documentation-référence-support-navigateurs--docs)`.
- L'id est le titre en minuscules, chaque espace ou `/` remplacé par `-`, suivi de `--docs`. Les accents restent. Vérifiez l'id dans l'URL de Storybook.
- `AGENTS.md` et les skills mettent un lien vers le fichier : `docs/reference/support-navigateurs.mdx`.

### Tableaux : en HTML

Un tableau Markdown à barres verticales s'affiche en texte brut. Écrivez le tableau en HTML. Le thème de Storybook le met en forme sans CSS.

```mdx
<table>
  <thead>
    <tr>
      <th>Commande</th>
      <th>Ce qu'elle vérifie</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>`npm run compat`</td>
      <td>Syntaxe JS de `dist/` et fonctionnalités CSS des sources</td>
    </tr>
  </tbody>
</table>
```

- Écrivez un `<th>` ou un `<td>` par ligne. Le Markdown en ligne fonctionne dans une cellule : `` `code` ``, `**gras**`, `[lien](…)`.
- `oxfmt` répartit les cellules longues sur plusieurs lignes. Gardez sa sortie : le rendu est identique.
- N'écrivez ni ligne vide ni bloc Markdown (liste, titre) dans une cellule.
- Les balises sont du JSX : `className`, `style={{ … }}`, chaque balise fermée.

### Pièges du MDX

- Pas d'extension GitHub : ni texte barré, ni liste de tâches, ni note de bas de page, ni URL nue.
- Écrivez chaque lien sous la forme `[texte](url)`. Le MDX ignore les liens `<https://…>`.
- `{` et `}` ouvrent une expression JavaScript. Mettez-les dans du code (`` `static {}` ``) ou échappez-les (`\{`).
- `<` suivi d'une lettre ou de `/` ouvre une balise JSX. Écrivez `Firefox avant 126`, ou mettez le texte dans du code.
- Un commentaire s'écrit `{/* commentaire */}`, jamais `<!-- -->`.

## 3. Écrivez les règles d'usage d'un composant (DSDS, pilote)

Les règles d'usage d'un composant vivent dans son document DSDS : `packages/components/src/components/<nom>/<nom>.dsds.yaml`. `packages/components/design-system.dsds.yaml` liste ces documents. `unicorne` et `unicorne-mcp` les lisent, comme la commande et le serveur de chaque marque (ADR 0039). La spec est sur [designsystemdocspec.org](https://designsystemdocspec.org), en version 0.23.1.

1. Écrivez chaque règle comme un élément de `guidelines` : un `level` (`must`, `should`, `may`, `should-not`, `must-not`) et un `statement` au présent, à l'impératif.
2. Donnez un `checkedBy` à chaque règle. Une règle `automated` cite dans `checks` le test qui la vérifie : `./button.stories.ts#Disabled`.
3. Réservez aux agents ce qui ne sert qu'à eux : une section `for: agent`. Storybook ne l'affiche pas.
4. Ne recopiez jamais l'API : attributs, slots, parts et tokens restent dans `custom-elements.json`. Les `traits` donnent seulement le sens de chaque valeur.
5. Marquez une règle pour les seuls contributeurs du socle : `$extensions: { dev.unicorne: { context: …, audience: contributors } }`. La documentation d'une marque la laisse de côté.
6. Mettez les champs dans l'ordre de la spec : `npx dsds-format <fichier>`.
7. Lancez `npm run dsds`, puis `npx vitest run --project browser .storybook/dsds.test.ts`. Le test compare les traits au composant et vérifie chaque lien vers un fichier ou une story.

`.storybook/dsds.ts` lit les documents, et `.storybook/DocumentationTemplate.mdx` affiche les règles dans la page du composant.

## 4. Écrivez un skill ou AGENTS.md

- Un skill est un guide pour les agents. Il contient la procédure et les conventions qui n'existent dans aucune page.
- Pour une règle déjà documentée dans une page, mettez un lien vers la page.
- La `description` d'un skill dit quand le charger, en une ou deux phrases.
- `AGENTS.md` est un index : une ligne par sujet, avec un lien.

## 5. Relisez

- La page a un seul type.
- Chaque phrase porte une idée, en 25 mots au plus. Une étape de procédure fait 20 mots au plus.
- Chaque étape porte une action, à l'impératif.
- Tout est au présent. Aucun « désormais », « nouveau », « ne… plus », ni futur.
- Chaque terme est celui du glossaire.
- Aucun remplissage : ni « Avantages », ni « Conclusion », ni adjectif promotionnel.
- Un fait documenté ailleurs est un lien, pas une copie.

## 6. Vérifiez

1. Formatez : `npx oxfmt <fichiers>`.
2. Construisez Storybook dans un dossier temporaire : `npx storybook build -o <dossier> --quiet`. Un MDX invalide fait échouer le build.
3. Servez ce dossier et ouvrez `iframe.html?viewMode=docs&id=<id>` avec Playwright.
4. Contrôlez le rendu : chaque tableau existe dans `#storybook-docs table`, et aucun texte `| ---` ne reste.
5. Contrôlez les liens : chaque id `?path=` correspond à une page.

Un bloc de code s'affiche après le chargement de la page. Attendez que chaque `pre` ait un contenu avant de le lire.
