import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent } from "storybook/test";
import type { Switch } from "./switch";

const meta = preview.meta({
  title: "Components/Switch",
  component: "u-switch",
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  args: {
    label: "Notifications",
    hint: "",
    checked: false,
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-switch` component turns on or off a setting that applies at once. It is a native checkbox with the `switch` role: it takes part in its form like `u-checkbox`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A switch with its label. A click or Space turns it on and off.",
      },
    },
  },
  render: (args) => html`
    <u-switch
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
    ></u-switch>
  `,
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector<Switch>("u-switch")!;
    await control.updateComplete;
    const input = control.shadowRoot!.querySelector<HTMLInputElement>('[part~="input"]')!;
    expect(input).toHaveRole("switch");
    expect(input).toHaveAccessibleName("Notifications");
    const onChange = fn();
    control.addEventListener("change", onChange);
    await userEvent.click(input);
    expect(control.checked).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
  },
});

export const States = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Off, on, and disabled. The thumb moves to the end of the track, along the text.",
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 0.5rem">
      <u-switch label="Off"></u-switch>
      <u-switch label="On" checked></u-switch>
      <u-switch label="Disabled" disabled></u-switch>
      <u-switch label="Disabled and on" disabled checked></u-switch>
      <u-switch label="مفعّل" checked dir="rtl" lang="ar"></u-switch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const switches = [...canvasElement.querySelectorAll<Switch>("u-switch")];
    await Promise.all(switches.map((control) => control.updateComplete));
    const thumbs = switches.map(
      (control) =>
        control.shadowRoot!.querySelector('[part~="thumb"]')!.getBoundingClientRect().left,
    );
    const tracks = switches.map(
      (control) =>
        control.shadowRoot!.querySelector('[part~="track"]')!.getBoundingClientRect().left,
    );
    // On: the thumb is further from the start of the track.
    expect(thumbs[1]! - tracks[1]!).toBeGreaterThan(thumbs[0]! - tracks[0]!);
    // In right-to-left text, the start is on the right: an on thumb is on the left.
    expect(thumbs[4]! - tracks[4]!).toBeLessThan(thumbs[1]! - tracks[1]!);
  },
});
