// A disclosure on the native <details>: its state, its toggle event, the
// accordion of a shared name, the real keyboard. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Details } from "./details.js";

async function mount(content: string) {
  document.body.innerHTML = content;
  const all = Array.from(document.querySelectorAll<Details>("u-details"));
  await Promise.all(all.map((details) => details.updateComplete));
  return all;
}

function summary(details: Details) {
  return details.shadowRoot!.querySelector<HTMLElement>("summary")!;
}

afterEach(() => {
  document.body.replaceChildren();
});

it("opens and closes from its summary, with Enter or a click, and fires toggle", async () => {
  const [details] = await mount(`<u-details label="Shipping">Free from 50 €.</u-details>`);
  const toggles: boolean[] = [];
  details!.addEventListener("toggle", () => toggles.push(details!.open));
  summary(details!).focus();
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => details!.open).toBe(true);
  expect(details!.hasAttribute("open")).toBe(true);
  await userEvent.click(summary(details!));
  await expect.poll(() => toggles).toEqual([true, false]);
});

it("follows open set by the application", async () => {
  const [details] = await mount(`<u-details label="Shipping">Free from 50 €.</u-details>`);
  details!.open = true;
  await details!.updateComplete;
  expect(details!.shadowRoot!.querySelector("details")!.open).toBe(true);
});

it("closes the others of its name, as an accordion", async () => {
  const all = await mount(`
    <u-details label="One" name="faq" open>1</u-details>
    <u-details label="Two" name="faq">2</u-details>
    <u-details label="Other">3</u-details>
  `);
  all[2]!.open = true;
  await userEvent.click(summary(all[1]!));
  await expect.poll(() => all.map((details) => details.open)).toEqual([false, true, true]);
});
