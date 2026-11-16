// The real keys, which the stories' synthetic ones can't replace: Escape
// closes a <dialog> only when the browser sees a trusted keydown. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Modal } from "../modal/modal.js";
import type { Autocomplete } from "./autocomplete.js";

afterEach(() => {
  document.body.replaceChildren();
});

it("closes its list on Escape, and leaves the modal around it open", async () => {
  document.body.innerHTML = `
    <u-modal label="Delivery">
      <u-autocomplete label="City"></u-autocomplete>
    </u-modal>
  `;
  const modal = document.querySelector<Modal>("u-modal")!;
  const field = document.querySelector<Autocomplete>("u-autocomplete")!;
  field.options = [{ value: "Paris" }, { value: "Pau" }];
  await modal.updateComplete;
  modal.showModal();
  await field.updateComplete;
  const input = field.shadowRoot!.querySelector("input")!;
  const popup = field.shadowRoot!.querySelector<HTMLElement>('[part~="popup"]')!;

  await userEvent.type(input, "pa");
  await expect.poll(() => popup.matches(":popover-open")).toBe(true);

  await userEvent.keyboard("{Escape}");
  await expect.poll(() => popup.matches(":popover-open")).toBe(false);
  expect(modal.open).toBe(true);

  // Pressed again, with the list closed: the modal's.
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => modal.open).toBe(false);
});
