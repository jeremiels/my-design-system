import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect } from "storybook/test";
import type { Button } from "../button/button";
import type { Toolbar } from "./toolbar";

const meta = preview.meta({
  title: "Components/Toolbar",
  component: "u-toolbar",
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: { type: "select" }, options: ["horizontal", "vertical"] },
  },
  args: {
    label: "Format",
    orientation: "horizontal",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-toolbar` component groups controls under a single Tab stop. The arrow keys move between them; Tab comes back to the one the user left.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "Three buttons, one of them disabled: the arrow keys skip it." },
    },
  },
  render: (args) => html`
    <u-toolbar label=${ifDefined(args.label)} orientation=${ifDefined(args.orientation)}>
      <u-button variant="secondary">Bold</u-button>
      <u-button variant="secondary" disabled>Italic</u-button>
      <u-button variant="secondary">Underline</u-button>
    </u-toolbar>
  `,
  play: async ({ canvasElement }) => {
    const toolbar = canvasElement.querySelector<Toolbar>("u-toolbar")!;
    const buttons = [...toolbar.querySelectorAll<Button>("u-button")];
    await Promise.all([toolbar, ...buttons].map((element) => element.updateComplete));
    await toolbar.updateComplete;
    expect(toolbar.shadowRoot!.querySelector('[part~="toolbar"]')).toHaveAccessibleName("Format");
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
  },
});
