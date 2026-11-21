import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, userEvent, waitFor } from "storybook/test";
import type { Drawer } from "./drawer";

/** Waits for the dialog's transitions: axe and the capture see its final state. */
async function settled(drawer: Drawer) {
  const dialog = drawer.shadowRoot!.querySelector("dialog")!;
  for (;;) {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const running = dialog.getAnimations({ subtree: true });
    if (running.length === 0) {
      return;
    }
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
}

const meta = preview.meta({
  title: "Components/Drawer",
  component: "u-drawer",
  tags: ["autodocs"],
  argTypes: {
    placement: { control: { type: "select" }, options: ["start", "end"] },
  },
  args: {
    label: "Filters",
    placement: "start",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-drawer` component is a modal panel along an edge of the page. It behaves as `u-modal`: a native `<dialog>`, opened by the `--show-modal` command, closed by its button, Escape or `--close`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A button opens the drawer with a command. It slides from the start edge.",
      },
    },
  },
  render: (args) => html`
    <u-button commandfor="drawer" command="--show-modal">Show the filters</u-button>
    <u-drawer id="drawer" label=${args.label} placement=${args.placement}>
      <p>Filter the orders by date and by status.</p>
    </u-drawer>
  `,
  play: async ({ canvasElement }) => {
    const drawer = canvasElement.querySelector<Drawer>("u-drawer")!;
    await drawer.updateComplete;
    await userEvent.click(
      canvasElement.querySelector("u-button")!.shadowRoot!.querySelector("button")!,
    );
    await waitFor(() => expect(drawer.open).toBe(true));
    await settled(drawer);
    const dialog = drawer.shadowRoot!.querySelector("dialog")!;
    expect(dialog).toHaveAccessibleName("Filters");
    expect(dialog.getBoundingClientRect().left).toBe(0);
  },
});

export const End = meta.story({
  parameters: {
    docs: {
      description: { story: '`placement="end"`: the drawer slides from the end edge.' },
    },
  },
  render: () => html`
    <u-drawer label="Order 42" placement="end" open>
      <p>Placed on November 20. Delivered tomorrow.</p>
    </u-drawer>
  `,
  play: async ({ canvasElement }) => {
    const drawer = canvasElement.querySelector<Drawer>("u-drawer")!;
    await drawer.updateComplete;
    await settled(drawer);
    const box = drawer.shadowRoot!.querySelector("dialog")!.getBoundingClientRect();
    expect(Math.round(box.right)).toBe(document.documentElement.clientWidth);
  },
});
