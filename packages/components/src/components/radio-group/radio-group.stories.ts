import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Radio } from "../radio/radio";
import type { RadioGroup } from "./radio-group";

/** The group of the story and its radios, once rendered. */
async function groupIn(canvasElement: HTMLElement, selector = "u-radio-group") {
  const group = canvasElement.querySelector<RadioGroup>(selector)!;
  const radios = [...group.querySelectorAll<Radio>("u-radio")];
  await Promise.all([group, ...radios].map((element) => element.updateComplete));
  await group.updateComplete;
  return { group, radios };
}

const meta = preview.meta({
  title: "Components/Radio group",
  component: "u-radio-group",
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: { type: "select" }, options: ["vertical", "horizontal"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Delivery",
    hint: "",
    value: "standard",
    orientation: "vertical",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-radio-group` component lets the user pick one value among its `u-radio` children. The group is the form control: it submits the value of the checked radio, and blocks the submission while `required` and empty. Tab reaches the checked radio; the arrow keys check the next and previous ones.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A group of three radios. The arrow keys move through them and check them.",
      },
    },
  },
  render: (args) => html`
    <u-radio-group
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      value=${ifDefined(args.value)}
      orientation=${ifDefined(args.orientation)}
      ?required=${args.required}
      ?disabled=${args.disabled}
    >
      <u-radio value="standard" label="Standard, in 3 days"></u-radio>
      <u-radio value="express" label="Express, tomorrow"></u-radio>
      <u-radio value="pickup" label="Pick-up in store"></u-radio>
    </u-radio-group>
  `,
  play: async ({ canvasElement }) => {
    const { group, radios } = await groupIn(canvasElement);
    const role = group.shadowRoot!.querySelector<HTMLElement>('[part~="group"]')!;
    expect(role).toHaveRole("radiogroup");
    expect(role).toHaveAccessibleName("Delivery");
    expect(radios[0]).toHaveRole("radio");
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);

    const onChange = fn();
    group.addEventListener("change", onChange);
    await userEvent.click(radios[2]!);
    expect(group.value).toBe("pickup");
    expect(onChange).toHaveBeenCalledOnce();
    await waitFor(() => expect(radios[2]!.getAttribute("aria-checked")).toBe("true"));
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, -1, 0]);
  },
});

export const Horizontal = meta.story({
  parameters: {
    docs: {
      description: {
        story: '`orientation="horizontal"` puts the radios side by side. The keys stay the same.',
      },
    },
  },
  render: () => html`
    <u-radio-group label="Size" value="m" orientation="horizontal">
      <u-radio value="s" label="Small"></u-radio>
      <u-radio value="m" label="Medium"></u-radio>
      <u-radio value="l" label="Large"></u-radio>
    </u-radio-group>
  `,
  play: async ({ canvasElement }) => {
    const { radios } = await groupIn(canvasElement);
    const [first, second] = radios.map((radio) => radio.getBoundingClientRect());
    expect(second!.top).toBe(first!.top);
    expect(radios[1]!.checked).toBe(true);
  },
});

export const DisabledAndError = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A disabled radio, which the keys skip, and a required group whose error shows once the form is submitted. A disabled group disables all its radios.",
      },
    },
  },
  render: () => html`
    <form style="display: grid; gap: 1rem" @submit=${(event: Event) => event.preventDefault()}>
      <u-radio-group
        id="required"
        label="Contact me by"
        hint="Pick one."
        error-message="Choose how to contact you."
        required
      >
        <u-radio value="email" label="Email"></u-radio>
        <u-radio value="phone" label="Phone" disabled></u-radio>
        <u-radio value="mail" label="Mail"></u-radio>
      </u-radio-group>
      <u-radio-group id="disabled" label="Plan" value="free" disabled>
        <u-radio value="free" label="Free"></u-radio>
        <u-radio value="pro" label="Pro"></u-radio>
      </u-radio-group>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { group, radios } = await groupIn(canvasElement, "#required");
    const form = canvasElement.querySelector("form")!;
    expect(form.checkValidity()).toBe(false);
    await waitFor(() =>
      expect(group.shadowRoot!.querySelector('[part~="error"]')!.textContent).toContain(
        "Choose how to contact you.",
      ),
    );
    expect(radios[1]!.getAttribute("aria-disabled")).toBe("true");
    const disabled = await groupIn(canvasElement, "#disabled");
    expect(disabled.radios.map((radio) => radio.tabIndex)).toEqual([-1, -1]);
  },
});
