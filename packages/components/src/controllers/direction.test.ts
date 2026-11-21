// The text direction of a host, read when it connects.
import { html, LitElement } from "lit";
import { afterEach, expect, it } from "vitest";
import { DirectionController } from "./direction.js";

class Arrow extends LitElement {
  direction = new DirectionController(this);
  renders = 0;

  render() {
    this.renders += 1;
    return html`<span>${this.direction.side("end")}</span>`;
  }
}
customElements.define("t-arrow", Arrow);

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const arrow = document.querySelector<Arrow>("t-arrow")!;
  await arrow.updateComplete;
  return arrow;
}

it("reads left to right by default: the end is on the right", async () => {
  const arrow = await mount("<t-arrow></t-arrow>");
  expect(arrow.direction.rtl).toBe(false);
  expect(arrow.direction.side("start")).toBe("left");
  expect(arrow.renderRoot.textContent).toBe("right");
});

it("reads the direction of an ancestor: the end is on the left", async () => {
  const arrow = await mount(`<div dir="rtl"><t-arrow></t-arrow></div>`);
  expect(arrow.direction.rtl).toBe(true);
  expect(arrow.direction.side("start")).toBe("right");
  expect(arrow.renderRoot.textContent).toBe("left");
  expect(arrow.renders).toBe(1);
});

it("reads it again when the host moves to another direction", async () => {
  const arrow = await mount(`<div dir="rtl"></div><t-arrow></t-arrow>`);
  expect(arrow.direction.rtl).toBe(false);
  document.querySelector("div")!.append(arrow);
  await arrow.updateComplete;
  expect(arrow.direction.rtl).toBe(true);
  expect(arrow.renderRoot.textContent).toBe("left");
});
