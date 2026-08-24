# withDisabled Mixin

The `withDisabled` mixin is a utility that helps manage the disabled state of components in a consistent manner. It provides styles and behaviors that can be applied to any component to ensure it visually and functionally reflects its disabled state.

It is a real mixin: it extends whatever base class you pass in, so your base's own properties, methods, and styles are preserved and composed with — not replaced.

## Usage

Import and apply the mixin to your component:

```ts
import { DSBaseElement } from "@/components/MyDSBaseElement";
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

### Attributes

- `disabled` - Reflects the `disabled` property state
- `aria-disabled` - Automatically set to "true" when the component is disabled

## Styling

When a component using this mixin is disabled, the following CSS properties are automatically applied:

- `pointer-events: none` - Prevents any interaction with the component
- `opacity: 0.6` - Reduces the visual prominence of the disabled element
- `cursor: not-allowed` - Shows the not-allowed cursor on hover

These styles can be customized by overriding the CSS properties in your component.
