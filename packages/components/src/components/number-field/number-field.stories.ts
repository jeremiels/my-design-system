import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, waitFor } from "storybook/test";
import type { NumberField } from "./number-field";

const meta = preview.meta({
  title: "Components/Number field",
  component: "u-number-field",
  tags: ["autodocs"],
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Quantity",
    hint: "",
    min: "1",
    max: "10",
    step: "1",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          'The `u-number-field` component is a labelled native `<input type="number">`: the browser validates the number, `min`, `max` and `step`, and steps the value with its arrows. For a code made of digits, use `u-text-field`.',
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "A number between 1 and 10. ArrowUp and ArrowDown step it." },
    },
  },
  render: (args) => html`
    <u-number-field
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      min=${ifDefined(args.min)}
      max=${ifDefined(args.max)}
      step=${ifDefined(args.step)}
      value="2"
      ?required=${args.required}
      ?disabled=${args.disabled}
    ></u-number-field>
  `,
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector<NumberField>("u-number-field")!;
    await field.updateComplete;
    const input = field.shadowRoot!.querySelector("input")!;
    expect(input).toHaveRole("spinbutton");
    expect(input).toHaveAccessibleName("Quantity");
    // The bounds reach the native input. The arrows are tested with the
    // real keyboard (range-field-base.test.ts): synthetic keys don't step it.
    expect([input.min, input.max, input.step]).toEqual(["1", "10", "1"]);
    field.value = "5";
    await field.updateComplete;
    expect(input.value).toBe("5");
  },
});

export const OutOfBounds = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A value above `max`: once validation has run, the browser's message shows.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: Event) => event.preventDefault()}>
      <u-number-field label="Guests" hint="10 at most." value="12" max="10"></u-number-field>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector<NumberField>("u-number-field")!;
    await field.updateComplete;
    expect(canvasElement.querySelector("form")!.checkValidity()).toBe(false);
    await waitFor(() =>
      expect(field.shadowRoot!.querySelector('[part~="error"]')!.textContent!.trim()).not.toBe(""),
    );
  },
});
