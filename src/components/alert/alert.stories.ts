import preview from "#.storybook/preview";
import { html } from "lit";
import "./alert";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect } from "storybook/test";
import type { Alert } from "./alert";

const meta = preview.meta({
  title: "Components/Alert",
  component: "my-alert",
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
          "The `my-alert` component is used to display important messages to users. It supports four types (information, success, warning, error) that determine the visual style of the alert. The content of the alert can be customized using the default slot.",
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
  render: (args) => html`
    <my-alert type="${ifDefined(args.type)}">${args.slot}</my-alert>
  `,
});

export const Variants = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Alerts in different types: information, success, warning, and error.",
      },
    },
  },
  render: () => html`
    <my-alert type="information">This is an information alert.</my-alert>
    <my-alert type="success">This is a success alert.</my-alert>
    <my-alert type="warning">This is a warning alert.</my-alert>
    <my-alert type="danger">This is an error alert.</my-alert>
  `,
  play: async ({ canvasElement }) => {
    const alerts = [...canvasElement.querySelectorAll<Alert>("my-alert")];
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
  },
});
