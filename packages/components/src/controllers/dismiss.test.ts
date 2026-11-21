// Dismissing a popup: Escape in the host, a press outside it, the focus
// leaving it. Each one calls `dismiss()` with its reason, while active.
import { html, LitElement } from "lit";
import { afterEach, beforeEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { DismissController, type DismissReason } from "./dismiss.js";

class Dismissable extends LitElement {
  active = true;

  reasons: DismissReason[] = [];

  constructor() {
    super();
    new DismissController(this, {
      active: () => this.active,
      dismiss: (reason) => this.reasons.push(reason),
      escapeKey: true,
      focusOut: true,
      outsidePress: true,
    });
  }

  render() {
    return html`<button id="first">First</button><button id="second">Second</button><slot></slot>`;
  }
}
customElements.define("t-dismissable", Dismissable);

let host: Dismissable;
let outside: HTMLButtonElement;

beforeEach(async () => {
  document.body.innerHTML = `
    <div id="parent"><t-dismissable><button id="child">Child</button></t-dismissable></div>
    <button id="outside">Outside</button>
  `;
  host = document.querySelector("t-dismissable")!;
  outside = document.querySelector<HTMLButtonElement>("#outside")!;
  await host.updateComplete;
});

afterEach(() => {
  document.body.replaceChildren();
});

function inner(id: string) {
  return host.shadowRoot!.querySelector<HTMLButtonElement>(`#${id}`)!;
}

it("dismisses on Escape, and keeps the key from the page", async () => {
  const parentKeys: string[] = [];
  document.querySelector("#parent")!.addEventListener("keydown", (event) => {
    parentKeys.push((event as KeyboardEvent).key);
  });
  inner("first").focus();
  await userEvent.keyboard("{Escape}");
  expect(host.reasons).toEqual(["escape-key"]);
  expect(parentKeys).toEqual([]);

  host.active = false;
  await userEvent.keyboard("{Escape}");
  expect(host.reasons).toEqual(["escape-key"]);
  expect(parentKeys).toEqual(["Escape"]);
});

it("leaves Escape to an input method that composes the text", () => {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    isComposing: true,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  inner("first").dispatchEvent(event);
  expect(host.reasons).toEqual([]);
  expect(event.defaultPrevented).toBe(false);
});

it("dismisses when the focus leaves the host, not when it moves inside", async () => {
  inner("first").focus();
  inner("second").focus();
  document.querySelector<HTMLButtonElement>("#child")!.focus();
  expect(host.reasons).toEqual([]);

  outside.focus();
  expect(host.reasons).toEqual(["focus-out"]);
});

it("dismisses on a press outside the host, not inside it", async () => {
  await userEvent.click(inner("first"));
  await userEvent.click(document.querySelector("#child")!);
  expect(host.reasons).not.toContain("outside-press");

  host.reasons = [];
  // Without the focus moving away: the press alone.
  outside.addEventListener("pointerdown", (event) => event.preventDefault());
  await userEvent.click(outside);
  expect(host.reasons).toContain("outside-press");
});

it("gives the press as the cause when it moves the focus away", async () => {
  inner("first").focus();
  await userEvent.click(outside);
  expect(host.reasons).toEqual(["outside-press"]);
});

it("doesn't dismiss on a press that starts inside and ends outside", () => {
  const options = { bubbles: true, composed: true };
  inner("first").dispatchEvent(new PointerEvent("pointerdown", options));
  outside.dispatchEvent(new PointerEvent("pointerup", options));
  expect(host.reasons).toEqual([]);
});

it("does nothing while inactive, nor once out of the document", () => {
  const options = { bubbles: true, composed: true };
  host.active = false;
  outside.dispatchEvent(new PointerEvent("pointerdown", options));
  outside.dispatchEvent(new PointerEvent("pointerup", options));
  expect(host.reasons).toEqual([]);

  host.active = true;
  host.remove();
  outside.dispatchEvent(new PointerEvent("pointerdown", options));
  outside.dispatchEvent(new PointerEvent("pointerup", options));
  expect(host.reasons).toEqual([]);
});
