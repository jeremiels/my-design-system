import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Checkbox } from "../checkbox/checkbox";
import type { CheckboxGroup } from "./checkbox-group";

/** The group of the story and its checkboxes, once rendered. */
async function groupIn(canvasElement: HTMLElement, selector = "u-checkbox-group") {
  const group = canvasElement.querySelector<CheckboxGroup>(selector)!;
  const boxes = [...group.querySelectorAll<Checkbox>("u-checkbox")];
  await Promise.all([group, ...boxes].map((element) => element.updateComplete));
  await group.updateComplete;
  return { group, boxes };
}

const meta = preview.meta({
  title: "Components/Checkbox group",
  component: "u-checkbox-group",
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: { type: "select" }, options: ["vertical", "horizontal"] },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Topics",
    hint: "",
    orientation: "vertical",
    required: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-checkbox-group` component gathers `u-checkbox` children under one label, hint and error. It submits each checked value under its `name`, as a `<select multiple>`: `values` holds them.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Three options, one checked by default. Each checkbox fires its own `change`.",
      },
    },
  },
  render: (args) => html`
    <u-checkbox-group
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      orientation=${ifDefined(args.orientation)}
      name="topics"
      ?required=${args.required}
      ?disabled=${args.disabled}
    >
      <u-checkbox label="News" value="news" checked></u-checkbox>
      <u-checkbox label="Offers" value="offers"></u-checkbox>
      <u-checkbox label="Events" value="events"></u-checkbox>
    </u-checkbox-group>
  `,
  play: async ({ canvasElement }) => {
    const { group, boxes } = await groupIn(canvasElement);
    const role = group.shadowRoot!.querySelector<HTMLElement>('[part~="group"]')!;
    expect(role).toHaveRole("group");
    expect(role).toHaveAccessibleName("Topics");
    expect(group.values).toEqual(["news"]);
    const onChange = fn();
    group.addEventListener("change", onChange);
    await userEvent.click(boxes[2]!.shadowRoot!.querySelector("input")!);
    expect(onChange).toHaveBeenCalledOnce();
    await waitFor(() => expect(group.values).toEqual(["news", "events"]));
  },
});

export const RequiredAndDisabled = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "A required group shows its error once the form is submitted with nothing checked. A disabled group disables its checkboxes.",
      },
    },
  },
  render: () => html`
    <form style="display: grid; gap: 1rem" @submit=${(event: Event) => event.preventDefault()}>
      <u-checkbox-group
        id="required"
        label="Days"
        hint="One at least."
        error-message="Choose a day at least."
        orientation="horizontal"
        required
      >
        <u-checkbox label="Monday" value="mon"></u-checkbox>
        <u-checkbox label="Tuesday" value="tue"></u-checkbox>
        <u-checkbox label="Wednesday" value="wed"></u-checkbox>
      </u-checkbox-group>
      <u-checkbox-group id="disabled" label="Alerts" disabled>
        <u-checkbox label="By email" value="email" checked></u-checkbox>
        <u-checkbox label="By text" value="sms"></u-checkbox>
      </u-checkbox-group>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const { group } = await groupIn(canvasElement, "#required");
    expect(canvasElement.querySelector("form")!.checkValidity()).toBe(false);
    await waitFor(() =>
      expect(group.shadowRoot!.querySelector('[part~="error"]')!.textContent).toContain(
        "Choose a day at least.",
      ),
    );
    const disabled = await groupIn(canvasElement, "#disabled");
    await waitFor(() =>
      expect(disabled.boxes.every((box) => box.shadowRoot!.querySelector("input")!.disabled)).toBe(
        true,
      ),
    );
  },
});
