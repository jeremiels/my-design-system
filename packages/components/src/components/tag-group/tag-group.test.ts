// Removing tags with the real keyboard: the focus stays in the group.
// Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Button } from "../button/button.js";
import type { TagGroup } from "./tag-group.js";

afterEach(() => {
  document.body.replaceChildren();
});

it("moves the focus to a neighbor, then to the group, as the tags go", async () => {
  document.body.innerHTML = `
    <button id="before">Before</button>
    <u-tag-group label="Filters">
      <u-tag removable>Paris</u-tag>
      <u-tag removable>Lyon</u-tag>
    </u-tag-group>`;
  const group = document.querySelector<TagGroup>("u-tag-group")!;
  group.addEventListener("u-remove", (event) => (event.target as Element).remove());
  const [paris, lyon] = group.querySelectorAll("u-tag");
  await group.updateComplete;

  document.querySelector<HTMLElement>("#before")!.focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(paris);
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => document.activeElement).toBe(lyon);

  await userEvent.keyboard(" ");
  await expect.poll(() => document.activeElement).toBe(group);
  expect(group.children).toHaveLength(0);
});

it("leaves the focus alone when the application keeps the tag", async () => {
  document.body.innerHTML = `
    <u-tag-group label="Filters"><u-tag removable>Paris</u-tag></u-tag-group>`;
  const group = document.querySelector<TagGroup>("u-tag-group")!;
  const tag = group.querySelector("u-tag")!;
  await group.updateComplete;
  // The tag delegates the focus to its remove button, a `u-button` rendered after it.
  await tag.updateComplete;
  await tag.shadowRoot!.querySelector<Button>("u-button")!.updateComplete;
  tag.focus();
  await userEvent.keyboard("{Enter}");
  // Another tag added later doesn't take the focus.
  group.insertAdjacentHTML("beforeend", "<u-tag>Lyon</u-tag>");
  await group.updateComplete;
  expect(document.activeElement).toBe(tag);
});
