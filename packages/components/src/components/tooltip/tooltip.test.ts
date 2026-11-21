// A tooltip: the description of its trigger, the pointer's delay, the
// keyboard focus, Escape. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { PopupToggleReason } from "../../events/popup-toggle.js";
import type { Tooltip } from "./tooltip.js";

async function mount() {
  document.body.innerHTML = `
    <button id="before">Before</button>
    <u-tooltip><button id="copy">Copy</button><span slot="content">Copy the link</span></u-tooltip>`;
  const tooltip = document.querySelector<Tooltip>("u-tooltip")!;
  await tooltip.updateComplete;
  const bubble = tooltip.shadowRoot!.querySelector<HTMLElement>('[part~="bubble"]')!;
  const reasons: PopupToggleReason[] = [];
  tooltip.addEventListener("u-toggle", (event) => reasons.push(event.reason));
  return { tooltip, bubble, reasons, trigger: document.querySelector<HTMLElement>("#copy")! };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("describes its trigger with its text", async () => {
  const { trigger } = await mount();
  await expect.element(trigger).toHaveAccessibleDescription("Copy the link");
});

it("shows on the keyboard focus, and hides on Escape and when the focus leaves", async () => {
  const { tooltip, bubble, reasons } = await mount();
  document.querySelector<HTMLElement>("#before")!.focus();
  await userEvent.keyboard("{Tab}");
  await expect.poll(() => bubble.matches(":popover-open")).toBe(true);
  await expect.element(bubble).toHaveRole("tooltip");
  await userEvent.keyboard("{Escape}");
  expect(tooltip.open).toBe(false);
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  expect(reasons).toEqual(["focus-in", "escape-key"]);
});

it("shows once the pointer rests on its trigger, and hides once it leaves", async () => {
  const { tooltip, trigger, reasons } = await mount();
  await userEvent.hover(trigger);
  await expect.poll(() => tooltip.open, { timeout: 2000 }).toBe(true);
  await userEvent.hover(document.querySelector("#before")!);
  await expect.poll(() => tooltip.open, { timeout: 2000 }).toBe(false);
  expect(reasons).toEqual(["hover", "hover"]);
});
