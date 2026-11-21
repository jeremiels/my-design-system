import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { TableSortEvent } from "../../events/table-sort";
import { sortRows } from "../../state/table";
import type { Table } from "./table";
import type { TableColumn } from "./table.type";

const meta = preview.meta({
  title: "Components/Table",
  component: "u-table",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "The `u-table` component renders a native table from `columns` and `rows`. A sortable header fires `u-sort`, and the application sorts its rows, with `sortRows()` or on its server. With `selectable`, checkboxes select rows, in `values`.",
      },
    },
  },
});

interface Request extends Record<string, unknown> {
  id: string;
  subject: string;
  applicant: string;
  date: Date;
  amount: number;
  status: "Received" | "Accepted" | "Refused";
}

const requests: Request[] = [
  {
    id: "R-104",
    subject: "Housing aid",
    applicant: "Dupont",
    date: new Date(2026, 9, 3),
    amount: 310,
    status: "Received",
  },
  {
    id: "R-087",
    subject: "School transport",
    applicant: "Martin",
    date: new Date(2026, 8, 14),
    amount: 1250.5,
    status: "Accepted",
  },
  {
    id: "R-112",
    subject: "Childcare",
    applicant: "Bernard",
    date: new Date(2026, 9, 21),
    amount: 95,
    status: "Refused",
  },
  {
    id: "R-099",
    subject: "Energy voucher",
    applicant: "Petit",
    date: new Date(2026, 8, 30),
    amount: 200,
    status: "Accepted",
  },
];

const variants = { Received: "information", Accepted: "success", Refused: "danger" } as const;

const columns: TableColumn<Request>[] = [
  { key: "id", label: "Request", rowHeader: true, sortable: true },
  { key: "applicant", label: "Applicant", sortable: true },
  { key: "subject", label: "Subject" },
  { key: "date", label: "Received on", sortable: true },
  { key: "amount", label: "Amount (€)", align: "end", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => html`<u-badge variant=${variants[row.status]}>${row.status}</u-badge>`,
  },
];

/** The table of the story, once rendered, and what it shows. */
async function tableIn(canvasElement: HTMLElement) {
  const table = canvasElement.querySelector<Table>("u-table")!;
  await table.updateComplete;
  const root = table.shadowRoot!;
  return {
    table,
    root,
    header: (label: string) =>
      [...root.querySelectorAll<HTMLElement>('[part~="column-header"]')].find((header) =>
        header.textContent!.includes(label),
      )!,
    firstColumn: () =>
      [...root.querySelectorAll('tbody tr:not([hidden]) > th[scope="row"]')].map((cell) =>
        cell.textContent!.trim(),
      ),
  };
}

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Requests, sorted by the application on `u-sort` with `sortRows()`. The status column renders a badge; numbers and dates show in the page's language.",
      },
    },
  },
  render: () => {
    const sort = (event: TableSortEvent) => {
      const table = event.currentTarget as Table;
      table.rows = sortRows(requests, event, table.lang || "en");
    };
    return html`
      <u-table
        lang="en"
        label="Requests"
        .columns=${columns}
        .rows=${requests}
        @u-sort=${sort}
      ></u-table>
    `;
  },
  play: async ({ canvasElement }) => {
    const { table, root, header, firstColumn } = await tableIn(canvasElement);
    expect(root.querySelector("caption")!.textContent!.trim()).toBe("Requests");
    expect(root.querySelector("tbody td.end")!.textContent!.trim()).toBe("310");
    expect(firstColumn()).toEqual(["R-104", "R-087", "R-112", "R-099"]);

    const onSort = fn();
    table.addEventListener("u-sort", onSort);
    const amount = header("Amount");
    await userEvent.click(amount.querySelector("button")!);
    await table.updateComplete;
    expect(onSort).toHaveBeenCalledOnce();
    expect(amount.getAttribute("aria-sort")).toBe("ascending");
    expect(firstColumn()).toEqual(["R-112", "R-099", "R-104", "R-087"]);

    await userEvent.click(amount.querySelector("button")!);
    await table.updateComplete;
    expect(amount.getAttribute("aria-sort")).toBe("descending");
    expect(firstColumn()).toEqual(["R-087", "R-104", "R-099", "R-112"]);
    // A single column has aria-sort.
    expect(root.querySelectorAll("[aria-sort]")).toHaveLength(1);
  },
});

export const Selectable = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`selectable`: a checkbox per row, named after its row header, and one for every row. `values` holds the `id` of the rows selected; each choice fires `change`.",
      },
    },
  },
  render: () => html`
    <u-table label="Requests" selectable .columns=${columns} .rows=${requests}></u-table>
  `,
  play: async ({ canvasElement }) => {
    const { table, root } = await tableIn(canvasElement);
    const onChange = fn();
    table.addEventListener("change", onChange);
    const boxes = [...root.querySelectorAll<HTMLInputElement>('[part~="select"]')];
    const all = root.querySelector<HTMLInputElement>('[part~="select-all"]')!;
    // The name of a checkbox: select-label, then its row's header.
    const names = boxes[1]!.getAttribute("aria-labelledby")!.split(" ");
    expect(names.map((id) => root.getElementById(id)!.textContent!.trim())).toEqual([
      "Select",
      "R-087",
    ]);

    await userEvent.click(boxes[1]!);
    await table.updateComplete;
    expect(table.values).toEqual(["R-087"]);
    expect(boxes[1]!.closest("tr")!.getAttribute("aria-selected")).toBe("true");
    expect(all.indeterminate).toBe(true);

    await userEvent.click(all);
    await table.updateComplete;
    expect(table.values).toEqual(["R-104", "R-087", "R-112", "R-099"]);
    expect(all.checked).toBe(true);
    await userEvent.click(all);
    await table.updateComplete;
    expect(table.values).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(3);
  },
});

export const Empty = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Without rows: the `empty` slot, across the columns.",
      },
    },
  },
  render: () => html`
    <u-table label="Requests" .columns=${columns}>
      <p slot="empty">No request yet.</p>
    </u-table>
  `,
  play: async ({ canvasElement }) => {
    const { root } = await tableIn(canvasElement);
    const row = root.querySelector<HTMLElement>("tr.empty")!;
    expect(row.hidden).toBe(false);
    expect(row.querySelector("td")!.colSpan).toBe(columns.length);
  },
});

export const Scrolling = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Past `--u-table-max-block-size`, the rows scroll under the header row. The table then takes the focus, for the keyboard, as a region named by its caption.",
      },
    },
  },
  render: () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      ...requests[index % requests.length]!,
      id: `R-${String(200 + index)}`,
    }));
    return html`
      <u-table
        label="Requests"
        style="--u-table-max-block-size: 16rem"
        .columns=${columns}
        .rows=${many}
      ></u-table>
    `;
  },
  play: async ({ canvasElement }) => {
    const { table, root } = await tableIn(canvasElement);
    const scroller = root.querySelector<HTMLElement>('[part~="scroller"]')!;
    await waitFor(() => expect(scroller.getAttribute("tabindex")).toBe("0"));
    expect(scroller.getAttribute("role")).toBe("region");
    scroller.scrollTop = 200;
    const head = root.querySelector("thead th")!.getBoundingClientRect();
    expect(Math.abs(head.top - scroller.getBoundingClientRect().top)).toBeLessThan(2);
    await table.updateComplete;
  },
});
