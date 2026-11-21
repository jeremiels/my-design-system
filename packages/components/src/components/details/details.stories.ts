import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { Details } from "./details";

const meta = preview.meta({
  title: "Components/Details",
  component: "u-details",
  tags: ["autodocs"],
  argTypes: {
    open: { control: "boolean" },
  },
  args: {
    label: "Shipping",
    open: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-details` component shows or hides its content under a summary, on the native `<details>`. Details that share a `name` form an accordion: one open at a time.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "A click or Enter on the summary opens it, and fires `toggle`." },
    },
  },
  render: (args) => html`
    <u-details label=${ifDefined(args.label)} ?open=${args.open}>
      Free delivery from 50 €, within 3 days.
    </u-details>
  `,
  play: async ({ canvasElement }) => {
    const details = canvasElement.querySelector<Details>("u-details")!;
    await details.updateComplete;
    const summary = details.shadowRoot!.querySelector("summary")!;
    expect(summary).toHaveAccessibleName("Shipping");
    const onToggle = fn();
    details.addEventListener("toggle", onToggle);
    await userEvent.click(summary);
    await waitFor(() => expect(details.open).toBe(true));
    await waitFor(() => expect(onToggle).toHaveBeenCalledOnce());
  },
});

export const Accordion = meta.story({
  parameters: {
    docs: {
      description: {
        story: 'Three details with `name="faq"`: opening one closes the open one.',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 0.5rem">
      <u-details label="How do I return an item?" name="faq" open>
        Within 30 days, from your account.
      </u-details>
      <u-details label="When am I refunded?" name="faq">Within 5 days of the return.</u-details>
      <u-details label="Can I change my order?" name="faq">Until it ships.</u-details>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const all = [...canvasElement.querySelectorAll<Details>("u-details")];
    await Promise.all(all.map((details) => details.updateComplete));
    all[1]!.open = true;
    await waitFor(() => expect(all.map((details) => details.open)).toEqual([false, true, false]));
  },
});
