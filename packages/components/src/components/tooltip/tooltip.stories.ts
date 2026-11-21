import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, userEvent, waitFor } from "storybook/test";
import type { Tooltip } from "./tooltip";

/** Waits for the bubble's transitions: axe and the capture see its final state. */
async function settled(bubble: HTMLElement) {
  for (;;) {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const running = bubble.getAnimations({ subtree: true });
    if (running.length === 0) {
      return;
    }
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
}

const meta = preview.meta({
  title: "Components/Tooltip",
  component: "u-tooltip",
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-tooltip` component shows a short description of its trigger while the pointer rests on it or the keyboard focuses it. The trigger and the text are its children: the trigger's `aria-describedby` reaches the text.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A native button with its tooltip. Tab shows it at once; Escape hides it.",
      },
    },
  },
  render: () => html`
    <u-tooltip>
      <button type="button">Copy</button>
      <span slot="content">Copy the link to this page</span>
    </u-tooltip>
  `,
  play: async ({ canvasElement }) => {
    const tooltip = canvasElement.querySelector<Tooltip>("u-tooltip")!;
    await tooltip.updateComplete;
    const trigger = canvasElement.querySelector("button")!;
    const bubble = tooltip.shadowRoot!.querySelector<HTMLElement>('[part~="bubble"]')!;
    expect(trigger).toHaveAccessibleDescription("Copy the link to this page");
    tooltip.show();
    await waitFor(() => expect(bubble.matches(":popover-open")).toBe(true));
    await userEvent.keyboard("{Escape}");
    tooltip.show();
    await settled(bubble);
  },
});
