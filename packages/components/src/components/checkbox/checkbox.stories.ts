import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Checkbox } from "./checkbox";

/** The checkboxes of the story, once rendered. */
async function checkboxesIn(canvasElement: HTMLElement) {
  const checkboxes = [...canvasElement.querySelectorAll<Checkbox>("u-checkbox")];
  await Promise.all(checkboxes.map((checkbox) => checkbox.updateComplete));
  return checkboxes.map((checkbox) => ({
    checkbox,
    input: checkbox.shadowRoot!.querySelector<HTMLInputElement>('[part~="input"]')!,
    box: checkbox.shadowRoot!.querySelector<HTMLElement>('[part~="box"]')!,
  }));
}

const meta = preview.meta({
  title: "Components/Checkbox",
  component: "u-checkbox",
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    indeterminate: { control: "boolean" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Send me the newsletter",
    hint: "",
    checked: false,
    indeterminate: false,
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-checkbox` component is a labelled checkbox that takes part in its form like a native one: it submits its value while checked, follows the form's reset and a `<fieldset disabled>`, and blocks the submission while `required` and unchecked.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A checkbox with its label after the box. A click on the box or on the label checks it.",
      },
    },
  },
  render: (args) => html`
    <u-checkbox
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      ?checked=${args.checked}
      ?indeterminate=${args.indeterminate}
      ?required=${args.required}
      ?disabled=${args.disabled}
    ></u-checkbox>
  `,
  play: async ({ canvasElement }) => {
    const [{ checkbox, input, box }] = await checkboxesIn(canvasElement);
    expect(input).toHaveAccessibleName("Send me the newsletter");
    expect(box.getBoundingClientRect().width).toBeGreaterThan(0);
    const onChange = fn();
    checkbox.addEventListener("change", onChange);
    await userEvent.click(input);
    expect(checkbox.checked).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
    await userEvent.click(checkbox.shadowRoot!.querySelector("label")!);
    expect(checkbox.checked).toBe(false);
  },
});

export const States = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Unchecked, checked, indeterminate, and disabled. `indeterminate` stands for a group of options of which some are checked.",
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 0.5rem">
      <u-checkbox label="Unchecked"></u-checkbox>
      <u-checkbox label="Checked" checked></u-checkbox>
      <u-checkbox label="Some of the options" indeterminate></u-checkbox>
      <u-checkbox label="Disabled" disabled></u-checkbox>
      <u-checkbox label="Disabled and checked" disabled checked></u-checkbox>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const items = await checkboxesIn(canvasElement);
    expect(items.map(({ input }) => input.checked)).toEqual([false, true, false, false, true]);
    expect(items[2]!.input.indeterminate).toBe(true);
    expect(items[3]!.input.disabled).toBe(true);
    // The drawn box follows the state: checked boxes take another color.
    const colors = items.map(({ box }) => getComputedStyle(box).backgroundColor);
    expect(colors[1]).not.toBe(colors[0]);
    expect(colors[2]).toBe(colors[1]);
  },
});

export const WithHintAndError = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required checkbox with a hint. Once the form is submitted unchecked, its error shows, with the message of `error-message`.",
      },
    },
  },
  render: () => html`
    <form @submit=${(event: Event) => event.preventDefault()}>
      <u-checkbox
        label="I accept the terms of use"
        hint="You can read them on the next page."
        error-message="Accept the terms of use to go on."
        required
      ></u-checkbox>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const [{ checkbox, input }] = await checkboxesIn(canvasElement);
    const form = canvasElement.querySelector("form")!;
    expect(form.checkValidity()).toBe(false);
    await waitFor(() =>
      expect(checkbox.shadowRoot!.querySelector('[part~="error"]')!.textContent).toContain(
        "Accept the terms of use to go on.",
      ),
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("hint error");
  },
});
