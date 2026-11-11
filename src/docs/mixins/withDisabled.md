# withDisabled Mixin

The `withDisabled` mixin is a utility that helps manage the disabled state of components in a consistent manner. It provides styles and behaviors that can be applied to any component to ensure it visually and functionally reflects its disabled state.

It is a real mixin: it extends whatever base class you pass in, so your base's own properties, methods, and styles are preserved and composed with — not replaced.

## Usage

Import and apply the mixin to your component:

```ts
import { DSBaseElement } from "@/components/base-element";
import { withDisabled } from "@/mixins/withDisabled";

export class MyComponent extends withDisabled(DSBaseElement) {
  // Your component code here
}
```

## API

### Properties

| Name       | Type      | Default | Description                                                                      |
| ---------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `disabled` | `boolean` | `false` | When `true`, disables the component. This property is reflected to an attribute. |

### Protected members

| Name         | Type      | Description                                                                                                                   |
| ------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `isDisabled` | `boolean` | `disabled`, or — for a form-associated component — an ancestor `<fieldset disabled>`. Render and ignore interactions from it. |

### Attributes

- `disabled` - Reflects the `disabled` property state
- `aria-disabled` - Automatically set to "true" when the component is disabled (`isDisabled`)

### Inside a `<fieldset disabled>`

A form-associated component (`static formAssociated = true`, see `withInternals`) is disabled by an ancestor `<fieldset disabled>`, like a native control, without any attribute being set on it. The browser reports it through `formDisabledCallback()`, which the mixin implements: that's why a component must read `isDisabled` rather than `disabled` (e.g. `<button ?disabled=${this.isDisabled}>`).

## Styling

When a component using this mixin is disabled (`:host([disabled])`, or `:host(:disabled)` inside a disabled fieldset), the following CSS properties are automatically applied:

- `pointer-events: none` - Prevents any interaction with the component
- `opacity: var(--u-opacity-disabled)` - Reduces the visual prominence of the disabled element

These styles can be customized by overriding the CSS properties in your component.
