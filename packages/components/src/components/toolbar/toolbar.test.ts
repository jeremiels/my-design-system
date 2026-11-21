// A toolbar of buttons of the base: one Tab stop, the arrows, the control
// the user left. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Button } from "../button/button.js";
import type { Toolbar } from "./toolbar.js";

afterEach(() => {
  document.body.replaceChildren();
});

it("is reached by a single Tab, moved through with the arrows, and remembers the last control", async () => {
  document.body.innerHTML = `
    <button id="before">Before</button>
    <u-toolbar label="Format">
      <u-button>Bold</u-button>
      <u-button disabled>Italic</u-button>
      <u-button>Underline</u-button>
    </u-toolbar>
    <button id="after">After</button>`;
  const toolbar = document.querySelector<Toolbar>("u-toolbar")!;
  const buttons = Array.from(toolbar.querySelectorAll<Button>("u-button"));
  await Promise.all([toolbar, ...buttons].map((element) => element.updateComplete));
  await toolbar.updateComplete;
  await expect
    .element(toolbar.shadowRoot!.querySelector<HTMLElement>('[part~="toolbar"]')!)
    .toHaveRole("toolbar");

  document.querySelector<HTMLElement>("#before")!.focus();
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(buttons[0]);
  await userEvent.keyboard("{ArrowRight}");
  expect(document.activeElement).toBe(buttons[2]);
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement?.id).toBe("after");
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  expect(document.activeElement).toBe(buttons[2]);
});
