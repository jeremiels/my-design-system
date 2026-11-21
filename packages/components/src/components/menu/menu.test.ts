// A menu button: the APG keys, the focus, the closing and its reasons, the
// commands. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { PopupToggleReason } from "../../events/popup-toggle.js";
import type { Button } from "../button/button.js";
import type { MenuItem } from "../menu-item/menu-item.js";
import type { Menu } from "./menu.js";

async function mount(attributes = "") {
  document.body.innerHTML = `
    <button id="outside">Outside</button>
    <u-menu id="menu" label="Actions" ${attributes}>
      <u-menu-item value="rename">Rename</u-menu-item>
      <u-menu-item value="duplicate" disabled>Duplicate</u-menu-item>
      <u-menu-item value="delete">Delete</u-menu-item>
    </u-menu>`;
  const menu = document.querySelector<Menu>("u-menu")!;
  const items = Array.from(menu.querySelectorAll<MenuItem>("u-menu-item"));
  await Promise.all([menu, ...items].map((element) => element.updateComplete));
  // The trigger is a `u-button`; its native control carries the ARIA.
  const trigger = menu.shadowRoot!.querySelector<Button>('[part~="trigger"]')!;
  await trigger.updateComplete;
  const control = trigger.shadowRoot!.querySelector("button")!;
  const popup = menu.shadowRoot!.querySelector<HTMLElement>('[part~="menu"]')!;
  const toggles: [string, PopupToggleReason][] = [];
  menu.addEventListener("u-toggle", (event) => toggles.push([event.newState, event.reason]));
  const pressed: string[] = [];
  for (const item of items) {
    item.addEventListener("click", () => pressed.push(item.value));
  }
  return { menu, items, trigger, control, popup, toggles, pressed };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("is a menu button whose menu is named by it", async () => {
  const { menu, control, popup, items } = await mount();
  await expect.element(control).toHaveAccessibleName("Actions");
  expect(control.getAttribute("aria-haspopup")).toBe("menu");
  expect(control.getAttribute("aria-expanded")).toBe("false");
  // Closed, the popup is hidden: out of the accessibility tree.
  menu.show();
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);
  await expect.element(popup).toHaveAccessibleName("Actions");
  await expect.element(items[0]!).toHaveRole("menuitem");
});

it("opens on its first item with Enter, moves past a disabled item, presses with Enter", async () => {
  const { menu, items, trigger, control, popup, toggles, pressed } = await mount();
  trigger.focus();
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => document.activeElement).toBe(items[0]);
  expect(control.getAttribute("aria-expanded")).toBe("true");
  expect(popup.matches(":popover-open")).toBe(true);
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(items[2]);
  await userEvent.keyboard("{Enter}");
  expect(pressed).toEqual(["delete"]);
  expect(menu.open).toBe(false);
  await expect.poll(() => menu.shadowRoot!.activeElement).toBe(trigger);
  expect(toggles).toEqual([
    ["open", "trigger-press"],
    ["closed", "item-press"],
  ]);
});

it("opens on its last item with ArrowUp, and finds an item by its first letters", async () => {
  const { items, trigger } = await mount();
  trigger.focus();
  await userEvent.keyboard("{ArrowUp}");
  await expect.poll(() => document.activeElement).toBe(items[2]);
  await userEvent.keyboard("r");
  expect(document.activeElement).toBe(items[0]);
});

it("closes on Escape back to its trigger, and on a press outside", async () => {
  const { menu, trigger, toggles } = await mount();
  await userEvent.click(trigger);
  await expect.poll(() => menu.open).toBe(true);
  await userEvent.keyboard("{Escape}");
  expect(menu.open).toBe(false);
  await expect.poll(() => menu.shadowRoot!.activeElement).toBe(trigger);
  await userEvent.click(trigger);
  await userEvent.click(document.querySelector("#outside")!);
  expect(menu.open).toBe(false);
  expect(toggles.map(([, reason]) => reason)).toEqual([
    "trigger-press",
    "escape-key",
    "trigger-press",
    "outside-press",
  ]);
});

it("opens and closes from a command button, and from its methods", async () => {
  const { menu } = await mount();
  const button = document.createElement("button");
  button.setAttribute("commandfor", "menu");
  button.setAttribute("command", "--toggle");
  button.textContent = "Toggle";
  document.body.append(button);
  await userEvent.click(button);
  await expect.poll(() => menu.open).toBe(true);
  menu.hide();
  await menu.updateComplete;
  expect(menu.open).toBe(false);
});
