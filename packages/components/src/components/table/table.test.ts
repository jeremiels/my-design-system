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
  document.body.innerHTML = `<button id="before">Before</button><u-table label="People" selectable></u-table>`;
  const table = document.querySelector<Table>("u-table")!;
  table.columns = [
    { key: "name", label: "Name", rowHeader: true, sortable: true },
    { key: "age", label: "Age", align: "end" },
  ];
  table.rows = [
    { id: "a", name: "Ada", age: 36 },
    { id: "g", name: "Grace", age: 85 },
  ];
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
  await userEvent.tab();
  // The header first: the box of every row, then the sort button.
  await userEvent.keyboard(" ");
  expect(table.values).toEqual(["a", "g"]);
  await userEvent.tab();
  await userEvent.keyboard("{Enter}");
  expect(sorts).toEqual(["name ascending"]);
  await table.updateComplete;
  expect(table.sortKey).toBe("name");
  // Then the box of the first row.
  await userEvent.tab();
  await userEvent.keyboard(" ");
  expect(table.values).toEqual(["g"]);
});

it("keeps the sort shown when the application cancels u-sort", async () => {
  const table = await mount();
  table.addEventListener("u-sort", (event) => event.preventDefault());
  const button = table.shadowRoot!.querySelector<HTMLButtonElement>('[part~="sort-button"]')!;
  await userEvent.click(button);
  await table.updateComplete;
  expect(table.sortKey).toBe("");
  expect(button.closest("th")!.hasAttribute("aria-sort")).toBe(false);
});

it("drops from the selection the rows that go", async () => {
  const table = await mount();
  table.values = ["a", "g"];
  table.rows = [{ id: "g", name: "Grace", age: 85 }];
  await table.updateComplete;
  expect(table.values).toEqual(["g"]);
});
