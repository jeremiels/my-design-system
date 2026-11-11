---
name: create-component
description: Create a new component in this design system, end to end — files, class, styles, API docs, registration, package exports, stories, contract and legacy tests, verification — or a brand-specific component in a brand design system built on it. Use when asked to add, scaffold or create a component; it orchestrates lit-component, component-styling, component-api-docs and storybook-documentation.
---

# Create a component

A new component touches a dozen places; most of them fail silently when
forgotten (a component that works in Storybook but isn't published, or isn't
in a brand's registration). Follow every step.

## 0. Base or brand?

- **Generic, useful to every brand** → this repository (`src/components/`).
- **Specific to one brand** → that brand's design system (see
  "Brand component" below and `examples/acme-design-system`).
- Pick the **component name**, without prefix: `card`, `button-link`. The tag
  will be `u-<name>` by default, `acme-<name>` for ACME.

## 1. Files — `src/components/<name>/`

- `<name>.ts` — the class (lit-component): extends `DSBaseElement` (mixins
  inline), `static override componentName = "<name>"`, declares
  `static dependencies` and uses `tagFor()` if it renders other components.
- `<name>.css` — its styles (component-styling): tokens
  `--u-<name>-<css-property>` on `:host`, defaulting to semantic tokens;
  `part="…"` on stylable internals.
- `<name>.type.ts` — its union types, if any.
- `<name>.stories.ts` — see step 4.
- Class JSDoc with `@element u-<name>`, `@summary`, slots, parts, every `:host`
  token, events (component-api-docs). A new event gets its class in
  `src/events/<name>-<event>.ts`, named `u-<event>`.

## 2. Register and publish

- `src/registry/catalog.ts`: add the class to `allComponents` — brands get it
  through `defineComponents({ components: [...allComponents, …] })`.
- `src/define.ts`: add `"u-<name>": <Class>` to `HTMLElementTagNameMap`.
- `src/index.ts`: export the class (and its event/types).
- `vite.config.ts`: add a `lib.entry` (`"<name>": resolve(import.meta.dirname,
  "src/components/<name>/<name>.ts")`).
- `package.json` `exports`: add `"./<name>"` with `types`
  (`./dist/components/<name>/<name>.d.ts`) and `import` (`./dist/<name>.js`).
- Any new `lit/...` import → `optimizeDeps.include` in `vite.config.ts`.

## 3. API manifest

`npm run analyze`, then review the `custom-elements.json` diff. Nothing to add
to the tests: `src/api-contract.test.ts` checks that the manifest documents
exactly the catalog's components (a missing `@element` or `allComponents` entry
fails), then the new component's parts, slots, attributes and tokens; the
registry and legacy tests also derive their lists from `allComponents`.

## 4. Stories

`<name>.stories.ts` next to the class, like `button.stories.ts`:
`component: "u-<name>"` (autodocs and controls come from the manifest), one
story per meaningful state, and `play` functions asserting behavior and
rendering (adopted styles, roles, events) — they run in Chromium, Firefox and
WebKit. The preview already registers the catalog (`src/define.ts`). MDX pages,
if any: storybook-documentation.

## 5. Legacy browsers

Add the element to `tests/legacy/index.html` (the page `checks.js` waits for
every catalog tag), plus a `check()` in `tests/legacy/checks.js` for anything
relying on a recent browser feature. `checks.js` is not transpiled: Firefox
115 syntax.

## 6. Verify

```sh
npm run analyze && git add custom-elements.json   # api:check compares with the staged manifest
npm run check                         # lint, fmt, tsc, api:check, Vitest (stories ×3 engines)
npm run compat && npm run test:legacy # matrix + real Firefox 115 on dist/
npm run example                       # packed base → ACME build + smoke test
npx publint && npx @arethetypeswrong/cli --pack . --profile esm-only   # if exports changed
```

Then commit the manifest with the code.

## Brand component

In the brand design system (e.g. `examples/acme-design-system`):

- Same class rules, importing from the base package: `import { DSBaseElement,
  Button } from "my-design-system"`; dependencies on base components resolve
  to the brand's overrides.
- Tokens use the brand prefix (`--acme-card-padding`), defaulting to the
  base's semantic tokens (`var(--u-spacing-lg)`).
- Add it to the brand's `defineComponents({ components: [...allComponents,
  AcmeCard] })`, its `HTMLElementTagNameMap` and its `src/index.ts`.
- Extending a base component instead: subclass it (`class AcmeButton extends
  Button`, `static styles = [Button.styles ?? [], acmeButtonStyles]`) and pass
  it in `overrides: { button: AcmeButton }`.
