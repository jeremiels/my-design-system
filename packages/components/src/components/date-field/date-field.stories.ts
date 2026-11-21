import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, waitFor } from "storybook/test";
import type { DateField } from "./date-field";

const meta = preview.meta({
  title: "Components/Date field",
  component: "u-date-field",
  tags: ["autodocs"],
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Arrival",
    hint: "",
    min: "",
    max: "",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          'The `u-date-field` component is a labelled native `<input type="date">`: the browser shows the date in the user\'s format, offers its calendar, and validates `min` and `max`. The value is in the format of HTML, `YYYY-MM-DD`.',
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "A date, in the format of HTML in `value`." },
    },
  },
  render: (args) => html`
    <u-date-field
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      min=${ifDefined(args.min || undefined)}
      max=${ifDefined(args.max || undefined)}
      value="2026-12-24"
      ?required=${args.required}
      ?disabled=${args.disabled}
    ></u-date-field>
  `,
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector<DateField>("u-date-field")!;
    await field.updateComplete;
    const input = field.shadowRoot!.querySelector("input")!;
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-12-24");
    expect(input).toHaveAccessibleName("Arrival");
  },
});

export const Bounds = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A date before `min`: once validation has run, the browser's message shows.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: Event) => event.preventDefault()}>
      <u-date-field
        label="Departure"
        hint="From January 1, 2027."
        value="2026-12-31"
        min="2027-01-01"
      ></u-date-field>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector<DateField>("u-date-field")!;
    await field.updateComplete;
    expect(canvasElement.querySelector("form")!.checkValidity()).toBe(false);
    await waitFor(() =>
      expect(field.shadowRoot!.querySelector('[part~="error"]')!.textContent!.trim()).not.toBe(""),
    );
  },
});
