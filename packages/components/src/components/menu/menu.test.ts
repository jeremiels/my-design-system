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

it("checks its choices: Space keeps the menu open, Enter closes it, a radio unchecks its group", async () => {
  document.body.innerHTML = `
    <u-menu label="View">
      <u-menu-item type="checkbox" value="grid" checked>Show the grid</u-menu-item>
      <u-menu-item type="radio" name="size" value="small">Small</u-menu-item>
      <u-menu-item type="radio" name="size" value="large" checked>Large</u-menu-item>
      <u-menu-item value="reset">Reset the view</u-menu-item>
    </u-menu>`;
  const menu = document.querySelector<Menu>("u-menu")!;
  const [grid, small, large, reset] = Array.from(menu.querySelectorAll<MenuItem>("u-menu-item"));
  await Promise.all([menu, grid!, small!, large!, reset!].map((element) => element.updateComplete));
  await menu.updateComplete;
  expect(grid!.getAttribute("role")).toBe("menuitemcheckbox");
  expect(grid!.getAttribute("aria-checked")).toBe("true");
  expect(small!.getAttribute("role")).toBe("menuitemradio");
  expect(reset!.getAttribute("role")).toBe("menuitem");
  expect(reset!.hasAttribute("aria-checked")).toBe(false);
  // The action keeps the place of the box: the labels align.
  expect(reset!.hasAttribute("data-indent")).toBe(true);

  const changes: string[] = [];
  menu.addEventListener("change", (event) => {
    const item = event.target as MenuItem;
    changes.push(`${item.value}:${item.checked}`);
  });
  const control = menu
    .shadowRoot!.querySelector<Button>('[part~="trigger"]')!
    .shadowRoot!.querySelector("button")!;
  control.focus();
  await userEvent.keyboard("{ArrowDown}");
  await expect.poll(() => menu.open).toBe(true);
  expect(document.activeElement).toBe(grid);

  // Space: unchecks the box, the menu stays open.
  await userEvent.keyboard(" ");
  await grid!.updateComplete;
  expect(grid!.getAttribute("aria-checked")).toBe("false");
  expect(menu.open).toBe(true);

  // Space on a radio: checks it, unchecks its group.
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard(" ");
  await small!.updateComplete;
  await large!.updateComplete;
  expect([small!.checked, large!.checked]).toEqual([true, false]);
  expect(large!.getAttribute("aria-checked")).toBe("false");

  // Enter: checks it, and closes the menu.
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard("{Enter}");
  expect([small!.checked, large!.checked]).toEqual([false, true]);
  expect(menu.open).toBe(false);
  expect(changes).toEqual(["grid:false", "small:true", "large:true"]);
});
