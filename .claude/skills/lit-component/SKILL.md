---
name: lit-component
description: Write or modify the class of a Lit web component in this design system (src/components/**/*.ts) or in a brand design system built on it — properties, rendering, events, rendering other components, ElementInternals, accessibility, extensibility for brands. Use for any change to a component's TypeScript; pair with component-styling for its CSS and component-api-docs for its JSDoc.
---

# Lit component classes

This library is a white-label base (ADR 0001, `src/docs/adr/0001-architecture-multi-marque.mdx`):
brands extend its classes and register them under their own prefix. Every
rule below exists so that a brand's extension keeps working.

Reference implementations: `src/components/alert/alert.ts` (simple),
`src/components/button/button-base.ts` + `button.ts` (shared base, mixins,
form participation), `src/components/modal/modal.ts` (renders another
component), `examples/acme-design-system/src/components/acme-card/acme-card.ts`
(brand component).

## Anatomy

```ts
import { property } from "lit/decorators.js";
import { html } from "lit";
import { DSBaseElement } from "../base-element.js";
import alertStyles from "./alert.css" with { type: "css" };
import type { AlertType } from "./alert.type.js";

/** …class JSDoc: see component-api-docs… */
export class Alert extends DSBaseElement {
  static override componentName = "alert";

  /** Alert type: sets the colors and how assistive technologies announce it. */
  @property({ type: String })
  type: AlertType = "information";

  static styles = [DSBaseElement.styles ?? [], alertStyles];

  render() {
    return html`<div part="alert" class="alert alert--${this.type}">…</div>`;
  }
}
```

- **Base class:** extend `DSBaseElement`, or another component class. Apply
  mixins **inline**: `extends withDisabled(DSBaseElement)`, never through a
  constant — the manifest analyzer only follows inline heritage.
- **`static componentName`:** the tag without prefix (`"button-link"`). Set it
  on every concrete component, never on an abstract base (`ButtonBase`).
- **Never register:** no `@customElement`, no `customElements.define`.
  `defineComponents()` registers (see create-component).
- **Styles:** `static styles = [super.styles ?? [], sheet]` (or
  `[Parent.styles ?? [], sheet]`), sheet from a sibling `.css` file — see
  component-styling.
- **Types:** union types in `<name>.type.ts`, shared ones in
  `src/types/common.ts` (`ComponentSize`, `SemanticVariant`). No `My` prefix.

## Properties

- `@property({ type: … })` with a one-line JSDoc description; the default is
  the initializer. Use `reflect: true` only when CSS or ARIA needs the
  attribute. Multi-word attributes: `attribute: "action-label"`.
- Internal state: `private`/`#private` fields or `@state()`. Members that must
  stay public for TypeScript but aren't API get `/** @internal */`.

## Rendering other components (ADR 0001, D2)

```ts
import { html } from "lit/static-html.js";
import { Button } from "../button/button.js";

static override dependencies = [Button];

render() {
  const button = this.tagFor(Button);
  return html`<${button} part="close-button">Close</${button}>`;
}
```

- `tagFor()` returns the tag **of this element's registration**: `u-modal`
  renders `u-button`, `acme-modal` renders the brand's override.
- Never hard-code another component's tag, never `document.createElement` one:
  the brand override would be bypassed, and a later move to scoped registries
  would no longer be localized.
- When the sub-element is an integration choice rather than a need, prefer a
  slot: the modal's close button is rendered (`tagFor(Button)`), its trigger
  is slotted (`slot="trigger"`).
- Any new `lit/...` import must be added to `optimizeDeps.include` in
  `vite.config.ts` (otherwise Vitest/Storybook re-optimize mid-run and fail).

## Events

One typed `Event` subclass per event in `src/events/{owner}-{event}.ts`, named
`u-<event>` (the base's prefix, whatever the brand), with its own
`bubbles`/`composed`, augmenting `GlobalEventHandlersEventMap` — copy
`src/events/button-click.ts`. Dispatch with
`this.dispatchEvent(new ClickEvent({ originalEvent: e }))`, document it with
`@fires`, and export it from `src/index.ts`.

## ElementInternals, forms, states

- Only through `withInternals()` (`this.internals`); never call
  `attachInternals()` yourself — it throws the second time.
- Form-associated components: `static formAssociated = true` (see `button.ts`).
- With `withDisabled`, render and handle interactions from `this.isDisabled`,
  not `this.disabled`: it also covers a form-associated component inside a
  `<fieldset disabled>` (`formDisabledCallback`).
- `this.internals` and `this.customStates` are `protected`: for the component
  and its subclasses, never exposed to the application.
- `customStates` is a no-op on Chrome < 125, Firefox < 126 and Safari < 17.4:
  `:state()` styling is an enhancement only — reflect an attribute too when
  the state matters for rendering.

## Extensibility for brands (ADR 0001, D3)

Public API = what's documented: properties, attributes, slots, parts, tokens,
events and **documented `protected` members**. So:

- Keep helpers brands may want to override `protected` and documented (e.g.
  `ButtonBase.handleClick`); everything else `private`/`#private`.
- Prefer splitting `render()` into documented `protected` parts over a
  monolithic template when brands will need to change one region.
- Renaming or removing anything public is a breaking change (major version).

## Accessibility

Native elements first (`<button>`, `<a>`, `<dialog>`); roles and ARIA where
native semantics don't cover it (`alert.ts` maps types to `role="alert"` or
`"status"`; `withDisabled` sets `aria-disabled`; a disabled `button-link`
drops its `href` but keeps `role="link"`). Never give an element the role of
another (a link stays a link). A component wrapping a native control delegates
focus to it (`static shadowRootOptions = { ...super.shadowRootOptions,
delegatesFocus: true }`, see `button-base.ts`), so `focus()` and `autofocus`
work on the host. A dialog needs an accessible name (`modal`'s `label`). No
user-facing text hard-coded in a template: a property with a default
(`closeLabel`) or a slot. Stories run the a11y addon, and any violation fails
the test.

## Browser support

Check every recent API against the matrix in
`src/docs/architecture/browser-support.mdx` (Chrome/Edge 111, Firefox 115 ESR,
Safari 16.4) before using it.

## Verify

```sh
npx tsc -p tsconfig.json --noEmit && npm run lint
npm run analyze && npx vitest run   # manifest + contract test, registry, stories ×3 engines
npm run test:legacy                 # when touching runtime APIs: real Firefox 115 on dist/
npm run example                     # when touching what brands extend
```
