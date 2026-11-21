// The edges a scrolling container hides content past, in either direction.
import { html, LitElement } from "lit";
import { afterEach, expect, it } from "vitest";
import { OverflowController } from "./overflow.js";

class Row extends LitElement {
  overflow = new OverflowController(this, () => this.renderRoot.querySelector<HTMLElement>(".row"));

  render() {
    return html`<div class="row" style="display: flex; overflow-x: auto; inline-size: 100px">
      ${Array.from({ length: 10 }, () => html`<span style="flex: none; inline-size: 50px">x</span>`)}
    </div>`;
  }
}
customElements.define("t-row", Row);

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(dir = "ltr") {
  document.body.innerHTML = `<t-row dir="${dir}"></t-row>`;
  const row = document.querySelector<Row>("t-row")!;
  await row.updateComplete;
  await row.updateComplete;
  return { row, container: row.renderRoot.querySelector<HTMLElement>(".row")! };
}

it("tells the content goes past the end, then past both edges once scrolled", async () => {
  const { row, container } = await mount();
  expect([row.overflow.start, row.overflow.end]).toEqual([false, true]);
  container.scrollLeft = 100;
  await expect.poll(() => [row.overflow.start, row.overflow.end]).toEqual([true, true]);
  container.scrollLeft = 400;
  await expect.poll(() => [row.overflow.start, row.overflow.end]).toEqual([true, false]);
});

it("works in right-to-left text", async () => {
  const { row, container } = await mount("rtl");
  expect([row.overflow.start, row.overflow.end]).toEqual([false, true]);
  container.scrollLeft = -100;
  await expect.poll(() => row.overflow.start).toBe(true);
});
