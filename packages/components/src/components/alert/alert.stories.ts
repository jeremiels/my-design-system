import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect } from "storybook/test";
import type { Icon } from "../icon/icon";
import type { Alert } from "./alert";

const meta = preview.meta({
  title: "Components/Alert",
  component: "u-alert",
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["information", "success", "warning", "danger"],
      defaultValue: "information",
    },
    slot: { control: "text" },
  },
  args: {
    type: "information",
    slot: "This is an alert message.",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-alert` component is used to display important messages to users. It supports four types (information, success, warning, error) that determine the visual style of the alert. The content of the alert can be customized using the default slot.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "The default alert with customizable type and content.",
      },
    },
  },
  render: (args) => html` <u-alert type="${ifDefined(args.type)}">${args.slot}</u-alert> `,
});

export const Variants = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Alerts in different types: information, success, warning, and error.",
      },
    },
  },
  render: () => html`
    <u-alert type="information">This is an information alert.</u-alert>
    <u-alert type="success">This is a success alert.</u-alert>
    <u-alert type="warning">This is a warning alert.</u-alert>
    <u-alert type="danger">This is an error alert.</u-alert>
  `,
  play: async ({ canvasElement }) => {
    const alerts = [...canvasElement.querySelectorAll<Alert>("u-alert")];
    await Promise.all(alerts.map((alert) => alert.updateComplete));
    const inner = alerts.map((alert) => alert.shadowRoot!.querySelector(".alert")!);
    // warning/danger interrupt (role="alert"); information/success are polite.
    expect(inner.map((el) => el.getAttribute("role"))).toEqual([
      "status",
      "status",
      "alert",
      "alert",
    ]);
    // Each type resolves to its own semantic token.
    const backgrounds = inner.map((el) => getComputedStyle(el).backgroundColor);
    expect(new Set(backgrounds).size).toBe(alerts.length);
    // Each type has its icon in the set of the base, by the same name.
    const icons = alerts.map((alert) => alert.shadowRoot!.querySelector<Icon>('[part~="icon"]')!);
    await Promise.all(icons.map((icon) => icon.updateComplete));
    expect(icons.map((icon) => icon.name)).toEqual(alerts.map((alert) => alert.type));
    for (const icon of icons) {
      expect(icon.shadowRoot!.querySelector("svg"), icon.name).not.toBeNull();
    }
  },
});
