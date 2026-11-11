---
name: component-api-docs
description: Document or change the public API of a component or mixin in this design system — class and member JSDoc (@element, @slot, @csspart, @cssprop, @fires, @internal), the generated Custom Elements Manifest (custom-elements.json), its contract test, and what counts as a breaking change for brands. Use whenever properties, attributes, slots, parts, tokens, events or protected members are added, renamed or removed.
---

# Component API documentation

The public API is declared once, in JSDoc, and turned into
`custom-elements.json` (Custom Elements Manifest) by `npm run analyze`
(ADR 0001, D3/D5). That manifest is committed, published with the package,
read by Storybook (autodocs, controls), inherited by brand design systems'
manifests, and checked against the rendered components by
`src/api-contract.test.ts`. Undocumented = internal.

## Class JSDoc

```ts
/**
 * One paragraph: what it is and when to use it.
 *
 * @element u-modal
 * @summary A modal dialog.
 * @slot - The dialog content.
 * @csspart dialog - The native `<dialog>`.
 * @cssprop [--u-modal-padding=var(--u-spacing-md)] - Content padding.
 * @fires {ModalCloseEvent} u-close - When the dialog closes.
 */
```

- `@element` is the tag of the default registration (`u-…`); Storybook matches
  it with the stories' `component: "u-…"`. Brand components use their brand
  tag (`@element acme-card`).
- `@slot` with `-` for the default slot (Storybook doesn't list unnamed slots;
  the manifest and the contract test do).
- `@csspart` for every `part="…"` in the template, and only those.
- `@cssprop [--name=default] - description` for every token declared on
  `:host`, with its default value; mention when variants or sizes change it.
- `@fires {EventClass} u-event - description`: dispatching a class instance
  isn't detected automatically.
- **Shared API is documented once, on the base class** (`ButtonBase` holds
  the slot, part, tokens and event of `u-button` and `u-button-link`); the
  analyzer copies it to subclasses, provided mixins are applied inline
  (`extends withInternals(ButtonBase)`).

## Members

- One-line description per public property; the default comes from the
  initializer (no `@default`, no `@property {Type} name` tags).
- Not API but must stay public for TypeScript: `/** @internal */` — it's
  dropped from the manifest (e.g. `Modal.dialog`, `DSBaseElement.tagNames`).
- Documented `protected` members are API for subclasses: keep them stable.
- Mixin members are documented in the mixin (`withDisabled`'s `disabled`) and
  appear on every component using it.

## Workflow

1. Change the code and its JSDoc together.
2. `npm run analyze`, then **read the `custom-elements.json` diff**: it is the
   API diff. Anything removed or renamed is a breaking change for brands
   (property, attribute, slot, part, token, event, protected member).
3. `npx vitest run`: `src/api-contract.test.ts` fails if a documented part,
   slot or attribute doesn't exist, or if documented and declared `:host`
   tokens differ. A new component also goes in its list of expected tags.
4. Commit the manifest with the code. CI: `npm run api:check` fails on a stale
   manifest.

## Brand design systems

They run the analyzer with `dependencies: true`: components extending the
base's classes are documented with what they inherit
(`examples/acme-design-system/custom-elements-manifest.config.mjs`). Their own
components follow the same JSDoc conventions with brand tags and tokens.
