// Sorting and selecting with the real keyboard. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { TableSortEvent } from "../../events/table-sort.js";
import type { Table } from "./table.js";

afterEach(() => {
  document.body.replaceChildren();
});

async function mount() {
  document.body.innerHTML = `
    <button id="before">Before</button>
    <u-table label="People" selectable>
      <u-table-row slot="head">
        <u-table-header-cell sort-key="name">Name</u-table-header-cell>
        <u-table-header-cell align="end">Age</u-table-header-cell>
      </u-table-row>
      <u-table-row value="a">
        <u-table-header-cell scope="row">Ada</u-table-header-cell>
        <u-table-cell align="end">36</u-table-cell>
      </u-table-row>
      <u-table-row value="g">
        <u-table-header-cell scope="row">Grace</u-table-header-cell>
        <u-table-cell align="end">85</u-table-cell>
      </u-table-row>
    </u-table>`;
  const table = document.querySelector<Table>("u-table")!;
  await table.updateComplete;
  for (const element of document.querySelectorAll<Table>("u-table-row, u-table-header-cell")) {
    await element.updateComplete;
  }
  await table.updateComplete;
  document.querySelector<HTMLElement>("#before")!.focus();
  return table;
}

it("reaches the checkboxes and the sort button with Tab, and works them with Space and Enter", async () => {
  const table = await mount();
  const sorts: string[] = [];
  table.addEventListener("u-sort", (event) => {
    const { key, direction } = event as TableSortEvent;
    sorts.push(`${key} ${direction}`);
  });
  // The head first: the checkbox of every row, then the sort button.
  await userEvent.tab();
  await userEvent.keyboard(" ");
  await expect.poll(() => table.values).toEqual(["a", "g"]);
  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  expect(sorts).toEqual(["name ascending"]);
  await expect.poll(() => table.sortKey).toBe("name");
  // Then the checkbox of the first row.
  await userEvent.tab();
  await userEvent.keyboard(" ");
  await expect.poll(() => table.values).toEqual(["g"]);
});

it("keeps the sort shown when the application cancels u-sort", async () => {
  const table = await mount();
  table.addEventListener("u-sort", (event) => event.preventDefault());
  const cell = table.querySelector("u-table-header-cell")!;
  await userEvent.click(cell.shadowRoot!.querySelector("button")!);
  await table.updateComplete;
  expect(table.sortKey).toBe("");
  expect(cell.shadowRoot!.querySelector("th")!.hasAttribute("aria-sort")).toBe(false);
});

it("drops from the selection the rows that go", async () => {
  const table = await mount();
  table.values = ["a", "g"];
  await table.updateComplete;
  table.querySelector('u-table-row[value="a"]')!.remove();
  await expect.poll(() => table.values).toEqual(["g"]);
});
