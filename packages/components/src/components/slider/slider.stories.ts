import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect } from "storybook/test";
import type { Slider } from "./slider";

const meta = preview.meta({
  title: "Components/Slider",
  component: "u-slider",
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
  },
  args: {
    label: "Volume",
    hint: "",
    min: "0",
    max: "100",
    step: "1",
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          'The `u-slider` component is a labelled native `<input type="range">`, restyled with its tokens. Its value shows after the track. It is never empty: without a value, the slider takes the middle of its bounds.',
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "A slider from 0 to 100. The arrows move it by `step`." },
    },
  },
  render: (args) => html`
    <u-slider
      label=${args.label}
      hint=${ifDefined(args.hint || undefined)}
      min=${ifDefined(args.min)}
      max=${ifDefined(args.max)}
      step=${ifDefined(args.step)}
      value="30"
      ?disabled=${args.disabled}
    ></u-slider>
  `,
  play: async ({ canvasElement }) => {
    const slider = canvasElement.querySelector<Slider>("u-slider")!;
    await slider.updateComplete;
    const input = slider.shadowRoot!.querySelector("input")!;
    expect(input).toHaveRole("slider");
    expect(input).toHaveAccessibleName("Volume");
    // The arrows are tested with the real keyboard (range-field-base.test.ts):
    // synthetic keys don't move a native range.
    slider.value = "31";
    await slider.updateComplete;
    expect(input.value).toBe("31");
    expect(slider.shadowRoot!.querySelector('[part~="value"]')!.textContent).toBe("31");
  },
});

export const States = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Without a value, at the middle; with a step of 10; disabled; and in right-to-left text, where the track fills from the right.",
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem">
      <u-slider label="Middle"></u-slider>
      <u-slider label="By ten" step="10" value="70"></u-slider>
      <u-slider label="Disabled" value="20" disabled></u-slider>
      <u-slider label="الصوت" value="25" dir="rtl" lang="ar"></u-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sliders = [...canvasElement.querySelectorAll<Slider>("u-slider")];
    await Promise.all(sliders.map((slider) => slider.updateComplete));
    await Promise.all(sliders.map((slider) => slider.updateComplete));
    expect(sliders.map((slider) => slider.value)).toEqual(["50", "70", "20", "25"]);
  },
});
