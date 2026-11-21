// A toaster: its queue, the announcements, the timers held by the pointer,
// the reasons of the closing. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { ToastCloseEvent, ToastCloseReason } from "../../events/toast-close.js";
import type { Toaster } from "./toaster.js";

async function mount(attributes = "") {
  document.body.innerHTML = `<u-toaster ${attributes}></u-toaster><button id="outside">Outside</button>`;
  const toaster = document.querySelector<Toaster>("u-toaster")!;
  await toaster.updateComplete;
  const closed: [number, ToastCloseReason][] = [];
  // `u-close` is typed as the modal's in the global map: the toaster's has an id.
  toaster.addEventListener("u-close", (event) => {
    const { id, reason } = event as unknown as ToastCloseEvent;
    closed.push([id, reason]);
  });
  const messages = () =>
    Array.from(toaster.shadowRoot!.querySelectorAll('[part~="toast"]'), (toast) =>
      toast.querySelector(".message")!.textContent!.trim(),
    );
  return { toaster, closed, messages };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("shows its messages in the top layer, and announces them", async () => {
  const { toaster, messages } = await mount();
  toaster.show("Saved", { duration: 0 });
  toaster.show("Payment refused", { variant: "danger", duration: 0 });
  await toaster.updateComplete;
  expect(messages()).toEqual(["Saved", "Payment refused"]);
  expect(toaster.shadowRoot!.querySelector('[part~="list"]')!.matches(":popover-open")).toBe(true);
  expect(toaster.shadowRoot!.querySelector('[role="status"]')!.textContent).toBe("Saved");
  expect(toaster.shadowRoot!.querySelector('[role="alert"]')!.textContent).toBe("Payment refused");
});

it("closes a message after its duration, on its button, or past the maximum", async () => {
  const { toaster, closed, messages } = await mount('max="2"');
  const first = toaster.show("One", { duration: 50 });
  await expect.poll(() => closed).toEqual([[first, "timeout"]]);
  const second = toaster.show("Two", { duration: 0 });
  toaster.show("Three", { duration: 0 });
  toaster.show("Four", { duration: 0 });
  await toaster.updateComplete;
  expect(messages()).toEqual(["Three", "Four"]);
  expect(closed.at(-1)).toEqual([second, "imperative"]);
  await userEvent.click(toaster.shadowRoot!.querySelector<HTMLElement>('[part~="close-button"]')!);
  expect(closed.at(-1)![1]).toBe("close-press");
  await toaster.updateComplete;
  expect(messages()).toEqual(["Four"]);
});

// The pointer holds them as the focus does: tested with the focus, the test
// page has no token sheet, and a message has no stable box there.
it("holds its messages while the focus is in them", async () => {
  const { toaster, closed } = await mount();
  toaster.show("Saved", { duration: 300 });
  await toaster.updateComplete;
  toaster.shadowRoot!.querySelector<HTMLElement>('[part~="close-button"]')!.focus();
  await new Promise((resolve) => setTimeout(resolve, 500));
  expect(closed).toEqual([]);
  document.querySelector<HTMLElement>("#outside")!.focus();
  await expect.poll(() => closed.length, { timeout: 2000 }).toBe(1);
});
