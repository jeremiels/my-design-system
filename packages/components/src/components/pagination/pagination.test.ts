// A pagination and a breadcrumb: their landmarks, the current page, the
// moves, the announcement. Chromium.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { Breadcrumb } from "../breadcrumb/breadcrumb.js";
import type { Button } from "../button/button.js";
import type { Pagination } from "./pagination.js";

afterEach(() => {
  document.body.replaceChildren();
});

describe("a pagination", () => {
  async function mount(attributes: string) {
    document.body.innerHTML = `<u-pagination ${attributes}></u-pagination>`;
    const pagination = document.querySelector<Pagination>("u-pagination")!;
    await pagination.updateComplete;
    const changes: number[] = [];
    pagination.addEventListener("change", () => changes.push(pagination.page));
    // Its buttons are `u-button` elements.
    const buttons = () =>
      Array.from(pagination.shadowRoot!.querySelectorAll<Button>('[part~="button"]'));
    return { pagination, changes, buttons };
  }

  it("is a navigation landmark whose current page has aria-current", async () => {
    const { pagination, buttons } = await mount('page="10" pages="20"');
    await expect
      .element(pagination.shadowRoot!.querySelector<HTMLElement>("nav")!)
      .toHaveAccessibleName("Pagination");
    expect(buttons().map((button) => button.textContent!.trim())).toEqual([
      "",
      "1",
      "9",
      "10",
      "11",
      "20",
      "",
    ]);
    const current = buttons().find((button) => button.current === "page")!;
    await current.updateComplete;
    const control = current.shadowRoot!.querySelector("button")!;
    expect(control.getAttribute("aria-current")).toBe("page");
    await expect.element(control).toHaveAccessibleName("Page 10");
  });

  it("moves on a click of a page, of previous or next, with change and an announcement", async () => {
    const { pagination, changes, buttons } = await mount('page="1" pages="5"');
    expect(buttons()[0]!.disabled).toBe(true);
    await userEvent.click(buttons().find((button) => button.textContent!.trim() === "3")!);
    await userEvent.click(buttons().at(-1)!);
    expect(changes).toEqual([3, 4]);
    await pagination.updateComplete;
    expect(pagination.shadowRoot!.querySelector('[role="status"]')!.textContent).toBe(
      "Page 4 of 5",
    );
    await userEvent.click(buttons()[0]!);
    expect(pagination.page).toBe(3);
  });
});

describe("a breadcrumb", () => {
  it("is a navigation landmark whose last item is the current page", async () => {
    document.body.innerHTML = `
      <u-breadcrumb>
        <u-breadcrumb-item href="/">Home</u-breadcrumb-item>
        <u-breadcrumb-item href="/orders">Orders</u-breadcrumb-item>
        <u-breadcrumb-item>Order 42</u-breadcrumb-item>
      </u-breadcrumb>`;
    const breadcrumb = document.querySelector<Breadcrumb>("u-breadcrumb")!;
    const items = Array.from(breadcrumb.querySelectorAll("u-breadcrumb-item"));
    await breadcrumb.updateComplete;
    await Promise.all(items.map((item) => (item as unknown as Breadcrumb).updateComplete));
    await expect
      .element(breadcrumb.shadowRoot!.querySelector<HTMLElement>("nav")!)
      .toHaveAccessibleName("Breadcrumb");
    await expect.element(items[0]!).toHaveRole("listitem");
    const links = items.map((item) => item.shadowRoot!.querySelector('[part~="link"]')!);
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([null, null, "page"]);
    expect((links[0] as HTMLAnchorElement).href).toMatch(/\/$/);
  });
});
