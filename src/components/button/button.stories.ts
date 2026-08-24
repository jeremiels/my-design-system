import preview from "#.storybook/preview";
import { html } from "lit";
import "./button";

const meta = preview.meta({
  title: "Components/Button",
  component: "my-button",
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["small", "medium", "large"],
      defaultValue: "medium",
    },
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "success", "danger", "warning", "information"],
    },
    disabled: { control: "boolean" },
    slot: { control: "text" },
  },
  args: {
    size: "medium",
    variant: "primary",
    disabled: false,
    slot: "Button",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `my-button` component is a versatile button element with customizable size, variant, and disabled state. It supports three sizes (small, medium, large) and six variants (primary, secondary, success, danger, warning, information). The button can also be disabled to prevent user interaction.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "The default button with customizable size, variant, and disabled state.",
      },
    },
  },
  render: (args) => html`
    <my-button size="${args.size}" variant="${args.variant}" ?disabled="${args.disabled}"
      >${args.slot}</my-button
    >
  `,
});

export const Sizes = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Buttons in different sizes: small, medium, and large.",
      },
      canvas: {
        sourceState: "shown",
      },
    },
  },
  render: () => html`
    <my-button size="small">Small</my-button>
    <my-button size="medium">Medium</my-button>
    <my-button size="large">Large</my-button>
  `,
});

export const Variants = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Buttons in different variants: primary, secondary, success, danger, warning, and information.",
      },
      canvas: {
        sourceState: "shown",
      },
    },
  },
  render: () => html`
    <my-button variant="primary">Primary</my-button>
    <my-button variant="secondary">Secondary</my-button>
    <my-button variant="success">Success</my-button>
    <my-button variant="danger">Danger</my-button>
    <my-button variant="warning">Warning</my-button>
    <my-button variant="information">Information</my-button>
  `,
});

export const Disabled = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Buttons in disabled state.",
      },
      canvas: {
        sourceState: "shown",
      },
    },
  },
  render: () => html`
    <my-button disabled>Disabled</my-button>
    <my-button variant="secondary" disabled>Disabled Secondary</my-button>
  `,
});
