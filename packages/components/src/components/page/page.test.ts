// The skip link of a page, with the real keyboard: first Tab, Enter, then
// the next Tab enters the content. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Page } from "./page.js";

afterEach(() => {
  document.body.replaceChildren();
});

it("skips the header and the navigation: Tab, Enter, then Tab enters the content", async () => {
  document.body.innerHTML = `
    <u-page>
      <u-header slot="header" service-name="Requests" href="#"></u-header>
      <u-side-nav slot="navigation" label="Requests">
        <u-side-nav-item label="Received" href="#received" current></u-side-nav-item>
      </u-side-nav>
      <h1>Received requests</h1>
      <button id="first">Review the first one</button>
    </u-page>`;
  const page = document.querySelector<Page>("u-page")!;
  await page.updateComplete;
  const skip = page.shadowRoot!.querySelector('[part~="skip-link"]');

  await userEvent.keyboard("{Tab}");
  expect(page.shadowRoot!.activeElement).toBe(skip);
  await userEvent.keyboard("{Enter}");
  expect(page.shadowRoot!.activeElement).toBe(page.shadowRoot!.querySelector("main"));
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(document.querySelector("#first"));
});

it("moves the focus to the content with focusContent()", async () => {
  document.body.innerHTML = `<u-page><p>Content</p></u-page>`;
  const page = document.querySelector<Page>("u-page")!;
  await page.updateComplete;
  page.focusContent();
  expect(page.shadowRoot!.activeElement).toBe(page.shadowRoot!.querySelector("main"));
});
