import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, userEvent, waitFor } from "storybook/test";
import type { Button } from "../button/button";
import type { Popover } from "./popover";

/** Waits for the panel's transitions: axe sees its final state. */
async function settled(panel: HTMLElement) {
  for (;;) {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const running = panel.getAnimations({ subtree: true });
    if (running.length === 0) {
      return;
    }
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
}

const meta = preview.meta({
  title: "Components/Popover",
  component: "u-popover",
  tags: ["autodocs"],
  args: {
    label: "Shipping",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-popover` component is a button that shows a panel of content below it, a non-modal dialog. Escape, a press outside or the focus leaving close it. Each opening and closing fires `u-toggle`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "The panel open: a text and a link, which Tab reaches." },
    },
  },
  render: (args) => html`
    <u-popover label=${ifDefined(args.label)}>
      <p style="margin: 0 0 0.5rem">Free delivery from 50 €, within 3 days.</p>
      <a href="#rates">See all the rates</a>
    </u-popover>
  `,
  play: async ({ canvasElement }) => {
    const popover = canvasElement.querySelector<Popover>("u-popover")!;
    await popover.updateComplete;
    // The trigger is a `u-button`; its native control carries the name and the ARIA.
    const trigger = popover.shadowRoot!.querySelector<Button>('[part~="trigger"]')!;
    await trigger.updateComplete;
    const control = trigger.shadowRoot!.querySelector("button")!;
    const panel = popover.shadowRoot!.querySelector<HTMLElement>('[part~="panel"]')!;
    await expect(control).toHaveAccessibleName("Shipping");
    await userEvent.click(trigger);
    await waitFor(() => expect(panel.matches(":popover-open")).toBe(true));
    await waitFor(() => expect(control.getAttribute("aria-expanded")).toBe("true"));
    await settled(panel);
  },
});
