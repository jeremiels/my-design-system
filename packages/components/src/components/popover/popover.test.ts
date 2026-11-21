// A popover: its trigger, the non-modal dialog, Tab into the content, the
// closing. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Popover } from "./popover.js";

afterEach(() => {
  document.body.replaceChildren();
});

it("opens a named dialog, which Tab enters, and Escape closes back to the trigger", async () => {
  document.body.innerHTML = `
    <u-popover label="Shipping"><a href="#rates">See the rates</a></u-popover>
    <button id="outside">Outside</button>`;
  const popover = document.querySelector<Popover>("u-popover")!;
  await popover.updateComplete;
  const trigger = popover.shadowRoot!.querySelector<HTMLButtonElement>('[part~="trigger"]')!;
  const panel = popover.shadowRoot!.querySelector<HTMLElement>('[part~="panel"]')!;
  expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");

  await userEvent.click(trigger);
  await expect.poll(() => panel.matches(":popover-open")).toBe(true);
  await expect.element(panel).toHaveRole("dialog");
  await expect.element(panel).toHaveAccessibleName("Shipping");
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(popover.querySelector("a"));
  await userEvent.keyboard("{Escape}");
  expect(popover.open).toBe(false);
  await expect.poll(() => popover.shadowRoot!.activeElement).toBe(trigger);

  await userEvent.click(trigger);
  await userEvent.click(document.querySelector("#outside")!);
  expect(popover.open).toBe(false);
});
