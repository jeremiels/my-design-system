import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent } from "storybook/test";
import "./button";
import type { Button } from "./button";

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
      options: [
        "primary",
        "secondary",
        "success",
        "danger",
        "warning",
        "information",
      ],
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
        story:
          "The default button with customizable size, variant, and disabled state.",
      },
    },
  },
  render: (args) => html`
    <my-button
      size="${ifDefined(args.size)}"
      variant="${ifDefined(args.variant)}"
      ?disabled="${args.disabled}"
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
  play: async ({ canvasElement }) => {
    const buttons = [...canvasElement.querySelectorAll<Button>("my-button")];
    await Promise.all(buttons.map((button) => button.updateComplete));
    const backgrounds = buttons.map((button) => {
      // Base, disabled-mixin and button sheets (CSS module scripts), all adopted.
      expect(button.shadowRoot!.adoptedStyleSheets).toHaveLength(3);
      const inner = button.shadowRoot!.querySelector(".button")!;
      expect(getComputedStyle(inner).display).toBe("inline-grid");
      return getComputedStyle(inner).backgroundColor;
    });
    // Each variant resolves to its own semantic token.
    expect(new Set(backgrounds).size).toBe(buttons.length);
  },
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
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("my-button")!;
    await button.updateComplete;
    const onClick = fn();
    button.addEventListener("my-click", onClick);
    // Programmatic click: `pointer-events: none` would make userEvent refuse.
    button.shadowRoot!.querySelector<HTMLButtonElement>(".button")!.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-disabled")).toBe("true");
  },
});

export const SubmitsForm = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'With `type="submit"`, the button submits its ancestor form through ElementInternals — a button rendered in shadow DOM has no form owner otherwise.',
      },
    },
  },
  render: () => html`
    <form @submit=${(event: SubmitEvent) => event.preventDefault()}>
      <my-button type="submit">Submit</my-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector<Button>("my-button")!;
    await button.updateComplete;
    const onSubmit = fn();
    canvasElement.querySelector("form")!.addEventListener("submit", onSubmit);
    await userEvent.click(button.shadowRoot!.querySelector(".button")!);
    expect(onSubmit).toHaveBeenCalledOnce();
  },
});
