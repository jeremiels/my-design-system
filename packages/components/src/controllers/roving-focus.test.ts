// A roving tabindex over the children of a host: one tab stop, the arrows
// along the axis and the text direction, the disabled items skipped.
import { html, LitElement } from "lit";
import { afterEach, beforeEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { RovingFocusController } from "./roving-focus.js";

class Toolbar extends LitElement {
  active = 1;

  moves: number[] = [];

  roving = new RovingFocusController(this, {
    items: () => Array.from(this.querySelectorAll<HTMLElement>(":scope > button")),
    activeIndex: () => this.active,
    axis: () => "horizontal",
    homeEnd: true,
    moved: (index) => this.moves.push(index),
  });

  render() {
    return html`<slot></slot>`;
  }
}
customElements.define("t-toolbar", Toolbar);

let toolbar: Toolbar;
let buttons: HTMLButtonElement[];

beforeEach(async () => {
  document.body.innerHTML = `
    <t-toolbar>
      <button>Bold</button><button>Italic</button><button disabled>Link</button><button>Code</button>
    </t-toolbar>`;
  toolbar = document.querySelector("t-toolbar")!;
  buttons = Array.from(toolbar.querySelectorAll("button"));
  await toolbar.updateComplete;
});

afterEach(() => {
  document.body.replaceChildren();
});

it("lets Tab reach the active item only", () => {
  expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0, -1, -1]);
});

it("falls back to the first enabled item", async () => {
  toolbar.active = 2;
  toolbar.requestUpdate();
  await toolbar.updateComplete;
  expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1, -1]);
});

it("moves the focus with the arrows of its axis, skipping a disabled item and looping", async () => {
  buttons[1]!.focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(document.activeElement).toBe(buttons[3]);
  expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, -1, 0]);
  await userEvent.keyboard("{ArrowRight}");
  expect(document.activeElement).toBe(buttons[0]);
  await userEvent.keyboard("{ArrowDown}");
  expect(document.activeElement).toBe(buttons[0]);
  await userEvent.keyboard("{End}");
  expect(document.activeElement).toBe(buttons[3]);
  expect(toolbar.moves).toEqual([3, 0, 3]);
});

it("follows the text direction", async () => {
  toolbar.dir = "rtl";
  buttons[1]!.focus();
  await userEvent.keyboard("{ArrowLeft}");
  expect(document.activeElement).toBe(buttons[3]);
});

it("leaves the keys with a modifier to the page", async () => {
  buttons[1]!.focus();
  await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
  expect(document.activeElement).toBe(buttons[1]);
});
