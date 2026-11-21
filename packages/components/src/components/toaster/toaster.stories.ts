import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, waitFor } from "storybook/test";
import type { Toaster } from "./toaster";

const meta = preview.meta({
  title: "Components/Toaster",
  component: "u-toaster",
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-toaster` component shows the short messages that follow an action, in a corner of the page, above everything else. The application calls `show(message, { variant, duration })`; each closing fires `u-close` with its `reason`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Three messages that stay until the user closes them (`duration: 0`). A live region announces each one.",
      },
    },
  },
  render: () => html`<u-toaster close-label="Close"></u-toaster>`,
  play: async ({ canvasElement }) => {
    const toaster = canvasElement.querySelector<Toaster>("u-toaster")!;
    await toaster.updateComplete;
    toaster.show("Your changes are saved.", { variant: "success", duration: 0 });
    toaster.show("A new version is available.", { duration: 0 });
    toaster.show("The payment was refused.", { variant: "danger", duration: 0 });
    await toaster.updateComplete;
    const list = toaster.shadowRoot!.querySelector<HTMLElement>('[part~="list"]')!;
    await waitFor(() => expect(list.matches(":popover-open")).toBe(true));
    const closes = [...toaster.shadowRoot!.querySelectorAll('[part~="close-button"]')];
    expect(closes[0]).toHaveAccessibleName("Close");
    await Promise.allSettled(
      list.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
  },
});
