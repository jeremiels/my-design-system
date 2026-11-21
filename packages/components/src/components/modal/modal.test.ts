// The real input, which the stories' synthetic events can't replace: the
// browser fires `cancel` on a <dialog> only for a trusted Escape. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { ModalCancelReason } from "./modal.type.js";
import type { Modal } from "./modal.js";

afterEach(() => {
  document.body.replaceChildren();
});

async function open(attributes = "") {
  document.body.innerHTML = `<u-modal label="Delivery" ${attributes}><p>Content</p></u-modal>`;
  const modal = document.querySelector<Modal>("u-modal")!;
  const reasons: ModalCancelReason[] = [];
  modal.addEventListener("u-cancel", (event) => reasons.push(event.reason));
  await modal.updateComplete;
  modal.showModal();
  return { modal, reasons };
}

it("says Escape closes it", async () => {
  const { modal, reasons } = await open();
  await userEvent.keyboard("{Escape}");
  expect(reasons).toEqual(["escape-key"]);
  await expect.poll(() => modal.open).toBe(false);
});

it('says a press on the backdrop closes it, with closedby="any"', async () => {
  const { modal, reasons } = await open('closedby="any"');
  // The backdrop is the dialog, outside its box: the page under it is inert.
  await userEvent.click(document.body, { position: { x: 1, y: 1 }, force: true });
  expect(reasons).toEqual(["outside-press"]);
  await expect.poll(() => modal.open).toBe(false);
});

it('stays open on a press on the backdrop, without closedby="any"', async () => {
  const { modal, reasons } = await open();
  await userEvent.click(document.body, { position: { x: 1, y: 1 }, force: true });
  expect(reasons).toEqual([]);
  expect(modal.open).toBe(true);
});
