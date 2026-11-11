---
name: lit-mixin
description: Create or modify a behavior mixin in this design system (src/mixins/withX.ts) — when a mixin is the right tool, its signature, style merging, public interface, lifecycle, composition with withInternals, documentation and export. Use when a behavior is shared by several components or brands need to add it to their own components.
---

# Behavior mixins

References: `src/mixins/withDisabled.ts` (property, styles, ARIA in a
lifecycle), `src/mixins/withInternals.ts` (accepts abstract bases, one-time
browser API). Mixins are public API: brands apply them to their own
components (they're exported from `src/index.ts`).

## When to write one

- A behavior several components need, independent of their template
  (disabled state, form association, focus delegation…): a mixin.
- Universal to every component: `DSBaseElement` — and it stays thin.
- Specific to a family (button, button-link): an abstract base class
  (`ButtonBase`).

## Shape

```ts
import { LitElement, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import type { Constructor } from "../types/common.js";
import disabledStyles from "./withDisabled.css" with { type: "css" };

export declare class DisabledInterface {
  disabled: boolean;
}

/** Mixin: … */
export function withDisabled<T extends Constructor<LitElement>>(Base: T) {
  class DisabledElement extends Base {
    /** Disables interaction; also sets `aria-disabled="true"` on the host. */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    static styles = [(Base as unknown as typeof LitElement).styles ?? [], disabledStyles];

    protected updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);
      // …
    }
  }
  return DisabledElement as Constructor<DisabledInterface> & T;
}
```

- **Name** `withX`, file `src/mixins/withX.ts`, styles in `withX.css`.
- **Signature:** `Constructor<LitElement>`; use `AbstractConstructor` (and an
  `abstract class` inside) when it must accept abstract bases like
  `ButtonBase`, as `withInternals` does.
- **Public members** go in an exported `declare class XInterface`, and the
  return is cast to `Constructor<XInterface> & T`, so TypeScript sees them on
  the component.
- **Styles** extend the base's: `[(Base as unknown as typeof LitElement).styles
  ?? [], xStyles]`. Same rules as component styles (component-styling): values
  come from tokens, never literals (`withDisabled.css` uses
  `var(--u-opacity-disabled)`).
- **Lifecycles** always call `super` (`updated`, `connectedCallback`,
  `disconnectedCallback`, `firstUpdated`), and constructors take and forward
  `...args`: mixins stack in any order.
- **Once-per-element browser APIs:** never call `attachInternals()` in another
  mixin; require `withInternals()` and read `this.internals`.
- **Browser support:** guard APIs missing from the matrix and degrade to a
  no-op (`withInternals`' `customStates`).

## Using it

- Inline in `extends` — `class ButtonBase extends withDisabled(DSBaseElement)`
  — never through a constant, or the manifest analyzer loses the inherited
  members.
- Mixins stack through the hierarchy: `Button extends withInternals(ButtonBase)`,
  where `ButtonBase extends withDisabled(DSBaseElement)`.

## Document and export

- JSDoc each public member (it shows on every component using the mixin —
  see component-api-docs).
- A page `src/docs/mixins/withX.md` (Markdown, read on GitHub/in the editor,
  not in Storybook): purpose, usage, API table, browser-support notes, gotchas
  — like `withInternals.md`.
- Export it from `src/index.ts` with its interface.

## Verify

```sh
npx tsc -p tsconfig.json --noEmit
npm run analyze   # members appear on the components using the mixin
npx vitest run && npm run test:legacy
```
