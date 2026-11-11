---
name: component-styling
description: Write or change the CSS of a component or mixin in this design system (the .css file next to its .ts), or of a brand design system's components — component tokens, variants, parts, states, theming rules, browser support. Use for any shadow-DOM styling; global styles and token values live in src/styles and follow the CSS architecture doc instead.
---

# Component styling

Full rationale: `src/docs/architecture/css-architecture.mdx`. Reference:
`src/components/button/button-base.css` (tokens, variants, sizes, forced
colors), `src/components/modal/modal.css` (parts, documented exception).

## The file

- Styles live in a sibling `.css` file, imported as a CSS module script and
  appended after the inherited sheets:

  ```ts
  import alertStyles from "./alert.css" with { type: "css" };
  static styles = [DSBaseElement.styles ?? [], alertStyles];
  ```

- Never Lit `css` tagged templates. Never import `src/styles/**` this way:
  those are document-level styles (`my-design-system/styles.css`).
- Mixins do the same (`withDisabled.css`). Brand components too, with the
  base's Vite plugin (`my-design-system/vite-plugin`).

## Tokens: three tiers, one source of truth

1. **Primitive** (`src/styles/tokens/*.css`): raw values.
2. **Semantic** (`tokens/semantic.css`): intent aliases (`--u-color-action-bg`).
3. **Component**: declared on `:host`, defaulting to a **semantic** token,
   never a primitive nor a literal — and the rules only consume them:

```css
:host {
  --u-button-background-color: var(--u-color-action-bg);
}

.button {
  background-color: var(--u-button-background-color);
}

:host([variant="danger"]) {
  --u-button-background-color: var(--u-color-danger-bg);
}
```

- **Names:** every token starts with `--u-` (ADR 0001, D4). Component tokens:
  `--u-<component>-<css-property>[-<state>]`, `<component>` being the
  `componentName` (`button`, whatever the brand's tag); the CSS property in
  full (`background-color`, not `bg`). A brand's own components use the brand
  prefix (`--acme-card-padding`).
- **Variants and sizes** change component token defaults **on the host**,
  from reflected attributes (`:host([variant="danger"])`,
  `:host([size="small"])`, `reflect: true` on the property); they don't
  restyle properties. Never redeclare a documented token on an inner element
  (e.g. a `.button--danger` modifier class): it would override the value the
  application sets on the host, while the application's styles beat any
  `:host(…)` rule. `src/api-contract.test.ts` fails on both.
- **No literal fallback** in `var()`: the token stylesheet is a dependency.
  Two documented exceptions only — `forced-colors` system keywords
  (`ButtonText`, `Highlight`, `CanvasText`), and `::backdrop`, which inherits
  nothing before Chrome 122 / Firefox 120 / Safari 17.4 (see `modal.css`).
- **Every token declared on `:host` is public API:** document it with
  `@cssprop` (component-api-docs). `src/api-contract.test.ts` fails if declared
  and documented tokens differ — don't declare tokens nothing consumes.
- **No theme logic in components:** dark mode and brand themes only change
  token values (`tokens/color.css`, a brand's `u.tokens.brand` layer). Default
  colors keep WCAG AA contrast in both themes (`src/styles/tokens.test.ts`).
- **Motion:** durations come from `--u-motion-duration-*`; reduced motion is
  handled once in `tokens/motion.css`.

## Parts and states

- Put `part="…"` on internal elements brands may need to style, and document
  each one with `@csspart`; the contract test checks it's rendered.
- Style host states from attributes (`:host([disabled])`, plus
  `:host(:disabled)` for a form-associated element in a disabled fieldset).
  `:state()` is an enhancement only (unsupported on Chrome < 125,
  Firefox < 126, Safari < 17.4).
- Class names: block / `block--modifier` (`.button`, `.alert--pending`). They
  are **internal**: a subclass's sheet (a brand's `AcmeButton`) targets the
  base's internals through their parts (`[part~="button"]`), never through
  its classes.

## Browser support

Matrix: Chrome/Edge 111, Firefox 115 ESR, Safari 16.4
(`src/docs/architecture/browser-support.mdx`).

- Fine: nesting (Lightning CSS flattens it at build time), `color-mix()`,
  `@layer`, `:host`/`::part`.
- Enhancement only: `text-wrap`, `interpolate-size` (under `@supports`),
  `:state()`.
- Anything newer: check MDN/caniuse first. `npm run compat` runs doiuse, which
  misses `color-mix()`, `text-wrap`, `::backdrop` inheritance, `:state()` and
  nested at-rules.

## Verify

```sh
npm run analyze && npx vitest run   # contract test (tokens, parts), stories ×3 engines
npm run compat                      # syntax + caniuse features vs the matrix
npm run test:legacy                 # computed styles in real Firefox 115
```
