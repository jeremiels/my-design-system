// A radio group: one value, a roving tabindex, the real keyboard. Chromium.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Radio } from "../radio/radio.js";
import type { RadioGroup } from "./radio-group.js";

async function mount(attributes = "", radios = "") {
  const form = document.createElement("form");
  form.innerHTML = `
    <button type="button" id="before">Before</button>
    <u-radio-group label="Size" name="size" ${attributes}>
      ${
        radios ||
        `<u-radio value="s" label="Small"></u-radio>
        <u-radio value="m" label="Medium"></u-radio>
        <u-radio value="l" label="Large"></u-radio>`
      }
    </u-radio-group>`;
  document.body.append(form);
  const group = form.querySelector<RadioGroup>("u-radio-group")!;
  const items = Array.from(group.querySelectorAll<Radio>("u-radio"));
  await Promise.all([group, ...items].map((element) => element.updateComplete));
  await group.updateComplete;
  const events: string[] = [];
  group.addEventListener("input", () => events.push("input"));
  group.addEventListener("change", () => events.push(`change:${group.value}`));
  return { form, group, items, events };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("is a labelled radiogroup of radios, and submits the checked value", async () => {
  const { form, group, items } = await mount('value="m"');
  const role = group.shadowRoot!.querySelector<HTMLElement>('[role="radiogroup"]')!;
  await expect.element(role).toHaveAccessibleName("Size");
  await expect.element(items[1]!).toHaveRole("radio");
  await expect.element(items[1]!).toHaveAccessibleName("Medium");
  expect(items.map((radio) => radio.getAttribute("aria-checked"))).toEqual([
    "false",
    "true",
    "false",
  ]);
  expect([...new FormData(form)]).toEqual([["size", "m"]]);
});

it("is reached by Tab on its checked radio, or on its first one", async () => {
  const { group, items } = await mount('value="l"');
  document.querySelector<HTMLElement>("#before")!.focus();
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(items[2]);
  group.value = "";
  await group.updateComplete;
  expect(items.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
});

it("checks the next and previous radios with the arrows, looping, with input and change", async () => {
  const { group, items, events } = await mount('value="s"');
  items[0]!.focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(items[1]);
  expect(group.value).toBe("m");
  await userEvent.keyboard("{ArrowRight}{ArrowRight}");
  expect(group.value).toBe("s");
  await userEvent.keyboard("{ArrowUp}");
  expect(group.value).toBe("l");
  expect(events).toEqual([
    "input",
    "change:m",
    "input",
    "change:l",
    "input",
    "change:s",
    "input",
    "change:l",
  ]);
});

it("follows the text direction", async () => {
  const { group, items } = await mount('value="s" dir="rtl"');
  items[0]!.focus();
  await userEvent.keyboard("{ArrowLeft}");
  expect(group.value).toBe("m");
});

it("skips a disabled radio, and checks on a click or Space", async () => {
  const { group, items } = await mount(
    "",
    `<u-radio value="s" label="Small"></u-radio>
     <u-radio value="m" label="Medium" disabled></u-radio>
     <u-radio value="l" label="Large"></u-radio>`,
  );
  await userEvent.click(items[0]!);
  expect(group.value).toBe("s");
  await userEvent.keyboard("{ArrowDown}");
  expect(group.value).toBe("l");
  expect(items[1]!.getAttribute("aria-disabled")).toBe("true");
  group.value = "";
  await group.updateComplete;
  items[2]!.focus();
  await userEvent.keyboard(" ");
  expect(group.value).toBe("l");
});

it("blocks its form while required and empty, with the browser's message", async () => {
  const { form, group, items } = await mount("required");
  expect(form.checkValidity()).toBe(false);
  await group.updateComplete;
  const error = group.shadowRoot!.querySelector('[part="error"]')!;
  expect(error.textContent!.trim()).not.toBe("");
  expect(group.shadowRoot!.querySelector('[role="radiogroup"]')!.getAttribute("aria-invalid")).toBe(
    "true",
  );
  await userEvent.click(items[0]!);
  await group.updateComplete;
  expect(form.checkValidity()).toBe(true);
  expect(error.checkVisibility()).toBe(false);
});

it("writes the message of error-message", async () => {
  const { form, group } = await mount('required error-message="Choose a size."');
  form.checkValidity();
  await group.updateComplete;
  expect(group.shadowRoot!.querySelector('[part="error"]')!.textContent).toContain(
    "Choose a size.",
  );
});

it("is restored by the form's reset", async () => {
  const { form, group, items } = await mount('value="m"');
  await userEvent.click(items[2]!);
  form.reset();
  await group.updateComplete;
  expect(group.value).toBe("m");
  expect(items[1]!.checked).toBe(true);
});

describe("a read-only or disabled group", () => {
  it("keeps its value while read-only: the arrows move the focus only", async () => {
    const { group, items, events } = await mount('value="s" readonly');
    items[0]!.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(items[1]);
    await userEvent.click(items[2]!);
    expect(group.value).toBe("s");
    expect(events).toEqual([]);
  });

  it("disables its radios", async () => {
    const { group, items } = await mount('value="s" disabled');
    expect(items.map((radio) => radio.getAttribute("aria-disabled"))).toEqual([
      "true",
      "true",
      "true",
    ]);
    expect(items.map((radio) => radio.tabIndex)).toEqual([-1, -1, -1]);
    group.disabled = false;
    await group.updateComplete;
    expect(items.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
  });
});
