# withInternals Mixin

The `withInternals` mixin attaches `ElementInternals` to a component and exposes it as `this.internals`. It exists because `attachInternals()` can only be called **once per element** — components that need form participation or custom states must go through this mixin rather than calling `this.attachInternals()` themselves.

It is a real mixin: it extends whatever base class you pass in, so your base's own properties, methods, and styles are preserved and composed with — not replaced.

## Usage

Import and apply the mixin to your component:

```ts
import { DSBaseElement } from "@/components/base-element";
import { withInternals } from "@/mixins/withInternals";

export class MyComponent extends withInternals(DSBaseElement) {
  someMethod() {
    this.internals?.form?.requestSubmit();
  }
}
```

## When to use it

Apply this mixin only to components that actually need `ElementInternals` — most components don't:

- **Form participation** — form controls that need `internals.form`, `setFormValue()`, or validity state (combine with `static formAssociated = true`).
- **Custom states** — components that want `:state(x)` CSS hooks instead of reflecting extra boolean attributes.
- **ElementInternals-based ARIA** — components that want to set default semantics via `internals.role`/`internals.ariaLabel` rather than template attributes.

A purely decorative or display-only component (an alert message, a badge) gets nothing from this mixin and shouldn't apply it.

## API

### Properties

| Name            | Type                        | Description                                                                                          |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `internals`     | `ElementInternals \| undefined` | Set once in the constructor. `undefined` if `attachInternals()` isn't supported in the environment. |
| `customStates`  | `{ set, has }`               | Wraps `internals.states` to toggle/check `:state(x)` selectors.                                       |

## Browser support

`customStates` is a no-op wherever standard `:state()` isn't supported: Firefox < 126 and Safari < 17.4 (no `internals.states`), and Chrome 90–124, whose `CustomStateSet` only accepts the old `--name` syntax and throws on plain names. All three are in the supported matrix (see [browser support](../architecture/browser-support.mdx)), so treat `:state(x)` styling as an enhancement: if the component must look right in that state, also reflect an attribute and style that.

## Gotcha

Never call `this.attachInternals()` yourself in a component that applies this mixin (or extends one that does) — the browser throws `NotSupportedError: ElementInternals for the specified element was already attached`. Always read `this.internals` instead.
