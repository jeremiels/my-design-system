// A checkbox group: several values under one name, its checkboxes' state,
// the real pointer. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Checkbox } from "../checkbox/checkbox.js";
import type { CheckboxGroup } from "./checkbox-group.js";

async function mount(attributes = "") {
  const form = document.createElement("form");
  form.innerHTML = `
    <u-checkbox-group label="Topics" name="topics" ${attributes}>
      <u-checkbox label="News" value="news" checked></u-checkbox>
      <u-checkbox label="Offers" value="offers"></u-checkbox>
      <u-checkbox label="Events" value="events"></u-checkbox>
    </u-checkbox-group>`;
  document.body.append(form);
  const group = form.querySelector<CheckboxGroup>("u-checkbox-group")!;
  const boxes = Array.from(group.querySelectorAll<Checkbox>("u-checkbox"));
  await Promise.all([group, ...boxes].map((element) => element.updateComplete));
  await group.updateComplete;
  return { form, group, boxes };
}

function label(box: Element) {
  return box.shadowRoot!.querySelector("label")!;
}

afterEach(() => {
  document.body.replaceChildren();
});

it("is a labelled group that submits each checked value under its name", async () => {
  const { form, group, boxes } = await mount();
  const role = group.shadowRoot!.querySelector<HTMLElement>('[part~="group"]')!;
  await expect.element(role).toHaveRole("group");
  await expect.element(role).toHaveAccessibleName("Topics");
  expect([...new FormData(form)]).toEqual([["topics", "news"]]);
  await userEvent.click(label(boxes[2]!));
  await group.updateComplete;
  expect(group.values).toEqual(["news", "events"]);
  expect(group.value).toBe("news");
  expect([...new FormData(form)]).toEqual([
    ["topics", "news"],
    ["topics", "events"],
  ]);
});

it("checks the checkboxes of the values it is given", async () => {
  const { group, boxes } = await mount();
  group.values = ["offers"];
  await group.updateComplete;
  expect(boxes.map((box) => box.checked)).toEqual([false, true, false]);
  expect(group.value).toBe("offers");
});

it("blocks its form while required and empty, with the browser's message", async () => {
  const { form, group, boxes } = await mount("required");
  await userEvent.click(label(boxes[0]!));
  await group.updateComplete;
  expect(form.checkValidity()).toBe(false);
  await group.updateComplete;
  expect(group.shadowRoot!.querySelector('[part~="error"]')!.textContent!.trim()).not.toBe("");
  await userEvent.click(label(boxes[1]!));
  await group.updateComplete;
  expect(form.checkValidity()).toBe(true);
});

it("disables its checkboxes, or keeps their state while read-only", async () => {
  const { group, boxes } = await mount("disabled");
  expect(boxes.every((box) => box.shadowRoot!.querySelector("input")!.disabled)).toBe(true);
  group.disabled = false;
  group.readOnly = true;
  // The browser enables the group once its attribute is gone: one more render.
  await expect.poll(() => boxes[1]!.shadowRoot!.querySelector("input")!.disabled).toBe(false);
  await userEvent.click(label(boxes[1]!));
  expect(boxes[1]!.checked).toBe(false);
  expect(boxes[1]!.shadowRoot!.querySelector("input")!.getAttribute("aria-readonly")).toBe("true");
});

it("is restored by the form's reset", async () => {
  const { form, group, boxes } = await mount();
  await userEvent.click(label(boxes[0]!));
  await userEvent.click(label(boxes[1]!));
  form.reset();
  await group.updateComplete;
  expect(group.values).toEqual(["news"]);
});
