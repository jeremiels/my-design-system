---
name: storybook-documentation
description: Write or edit this design system's Storybook MDX documentation (src/docs/**/*.mdx, .storybook/*.mdx). Use when adding a docs page, a table, links between pages, or any MDX content — tables must be written in HTML because Storybook's MDX has no GitHub-flavored Markdown.
---

# Storybook documentation (MDX)

Storybook loads `src/**/*.mdx` (see `.storybook/main.ts`) and compiles it with
MDX **without `remark-gfm`**: CommonMark works, GitHub-flavored extras don't.
`.md` files (e.g. `src/docs/mixins/*.md`) are not loaded by Storybook — they
are read on GitHub or in the editor, where GFM tables are fine.

## Page skeleton

```mdx
import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="Documentation/Support navigateurs" />

# Support navigateurs
```

- Put pages under `Documentation/…`. Architecture docs (`src/docs/architecture/`)
  are written in French, like the existing pages.
- Link to another page with its docs id:
  `[Architecture CSS](?path=/docs/documentation-architecture-css--docs)`.
  The id is the kebab-cased title + `--docs`; check it in the Storybook URL
  rather than guessing when the title has accents or punctuation.

## Tables: HTML, never pipe tables

A GFM pipe table renders as raw text full of `|` (the page ends up with zero
`<table>` elements). Write HTML instead — Storybook's docs theme styles a bare
`<table>` (borders, padding, zebra rows), no extra CSS needed:

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

- One `<th>`/`<td>` per line. Inline Markdown works inside a cell:
  `` `code` ``, `**bold**`, `[link](…)`.
- `oxfmt` reflows long cells onto several lines. MDX then wraps the cell
  content in a `<p>`, which Storybook renders with no margin — it looks the
  same, so keep the formatter's output. Never put blank lines or block
  Markdown (lists, headings) inside a cell.
- The tags are JSX: `className` (not `class`), `style={{ … }}` objects, every
  tag closed.

## Other MDX pitfalls

- No GFM: no strikethrough (`~~x~~`), task lists, footnotes or bare-URL
  autolinks. MDX also drops CommonMark `<https://…>` autolinks — always write
  `[text](url)`.
- `{` / `}` in prose open a JavaScript expression: keep them in code
  (`` `static {}` ``) or escape them (`\{`).
- `<` directly followed by a letter or `/` opens a JSX tag: write
  `Firefox < 126` (with a space), or use code / `&lt;`.
- HTML comments (`<!-- -->`) are invalid; use `{/* comment */}`.

## Verify the rendering

A broken MDX file fails `storybook build`, but a pipe table compiles fine and
still renders wrong — so look at the page, not just the build:

1. `npm run storybook` and open the page; or build into a temporary directory
   (`npx storybook build -o <tmp-dir> --quiet`) and serve it.
2. Scripted check: open
   `iframe.html?viewMode=docs&id=<docs-id>` (e.g.
   `documentation-support-navigateurs--docs`) with Playwright — each table
   must exist as `#storybook-docs table` and no raw `| ---` text may remain in
   `#storybook-docs`.
3. `npx oxfmt --check <file>`: formatting is part of the repo's checks.
