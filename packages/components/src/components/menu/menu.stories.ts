import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { MenuItem } from "../menu-item/menu-item";
import type { Menu } from "./menu";

/** The menu of the story and its items, once rendered. */
async function menuIn(canvasElement: HTMLElement) {
  const menu = canvasElement.querySelector<Menu>("u-menu")!;
  const items = [...menu.querySelectorAll<MenuItem>("u-menu-item")];
  await Promise.all([menu, ...items].map((element) => element.updateComplete));
  return {
    menu,
    items,
    trigger: menu.shadowRoot!.querySelector<HTMLButtonElement>('[part~="trigger"]')!,
    popup: menu.shadowRoot!.querySelector<HTMLElement>('[part~="menu"]')!,
  };
}

/** Waits for the popup's transitions: axe and the capture see its final state. */
async function popupSettled(popup: HTMLElement) {
  for (;;) {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const running = popup.getAnimations({ subtree: true });
    if (running.length === 0) {
      return;
    }
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
}

const meta = preview.meta({
  title: "Components/Menu",
  component: "u-menu",
  subcomponents: { MenuItem: "u-menu-item" },
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
  },
  args: {
    label: "Actions",
    disabled: false,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-menu` component is a button that opens a list of actions, its `u-menu-item` children. The arrow keys move between the items; Enter, Space or a click fires the item's `click` and closes the menu. Each opening and closing fires `u-toggle`, with its `reason`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "A menu of three actions. A click on an item fires its `click` and closes the menu.",
      },
    },
  },
  render: (args) => html`
    <u-menu label=${ifDefined(args.label)} ?disabled=${args.disabled}>
      <u-menu-item value="rename">Rename</u-menu-item>
      <u-menu-item value="duplicate">Duplicate</u-menu-item>
      <u-menu-item value="delete">Delete</u-menu-item>
    </u-menu>
  `,
  play: async ({ canvasElement }) => {
    const { menu, items, trigger, popup } = await menuIn(canvasElement);
    expect(trigger).toHaveAccessibleName("Actions");
    const onClick = fn();
    items[1]!.addEventListener("click", onClick);
    await userEvent.click(trigger);
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    await userEvent.click(items[1]!);
    expect(onClick).toHaveBeenCalledOnce();
    await waitFor(() => expect(menu.open).toBe(false));
    await popupSettled(popup);
  },
});

export const Open = meta.story({
  parameters: {
    docs: {
      description: {
        story: "The menu open, its first item focused. A disabled item is skipped by the keys.",
      },
    },
  },
  render: () => html`
    <u-menu label="Order 42">
      <u-menu-item value="track">Track the parcel</u-menu-item>
      <u-menu-item value="invoice" disabled>Download the invoice</u-menu-item>
      <u-menu-item value="cancel">Cancel the order</u-menu-item>
    </u-menu>
  `,
  play: async ({ canvasElement }) => {
    const { items, trigger, popup } = await menuIn(canvasElement);
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(popup.matches(":popover-open")).toBe(true));
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    expect(items[1]!.getAttribute("aria-disabled")).toBe("true");
    await popupSettled(popup);
  },
});
