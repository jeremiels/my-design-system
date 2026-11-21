import preview from "#.storybook/preview";
import { html, render, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { TableSortEvent } from "../../events/table-sort";
import { sortRows } from "../../state/table";
import type { Checkbox } from "../checkbox/checkbox";
import type { TableRow } from "../table-row/table-row";
import type { Table } from "./table";

const meta = preview.meta({
  title: "Components/Table",
  component: "u-table",
  subcomponents: {
    TableRow: "u-table-row",
    TableCell: "u-table-cell",
    TableHeaderCell: "u-table-header-cell",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'The `u-table` component is written as an HTML table: `u-table-row` children, whose cells are `u-table-cell` and `u-table-header-cell`. The rows with `slot="head"` form its header. Any row fits: a row of details across the columns (`colspan`), a group heading. A header cell with `sort-key` fires `u-sort`, and the application sorts its rows. With `selectable`, a `u-checkbox` starts each row.',
      },
    },
  },
});

interface Request {
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
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const amount = new Intl.NumberFormat("en", { minimumFractionDigits: 2 });

const head = html`
  <u-table-row slot="head">
    <u-table-header-cell sort-key="id">Request</u-table-header-cell>
    <u-table-header-cell sort-key="applicant">Applicant</u-table-header-cell>
    <u-table-header-cell>Subject</u-table-header-cell>
    <u-table-header-cell sort-key="date">Received on</u-table-header-cell>
    <u-table-header-cell sort-key="amount" align="end">Amount (€)</u-table-header-cell>
    <u-table-header-cell>Status</u-table-header-cell>
  </u-table-row>
`;

/** The row of a request. */
function row(request: Request, extra: TemplateResult | string = "") {
  return html`
    <u-table-row value=${request.id}>
      <u-table-header-cell scope="row">${request.id}</u-table-header-cell>
      <u-table-cell>${request.applicant}</u-table-cell>
      <u-table-cell>${request.subject}</u-table-cell>
      <u-table-cell>${date.format(request.date)}</u-table-cell>
      <u-table-cell align="end">${amount.format(request.amount)}</u-table-cell>
      <u-table-cell
        ><u-badge variant=${variants[request.status]}>${request.status}</u-badge
        >${extra}</u-table-cell
      >
    </u-table-row>
  `;
}

/** The table of the story, once rendered, and what it shows. */
async function tableIn(canvasElement: HTMLElement) {
  const table = canvasElement.querySelector<Table>("u-table")!;
  const rows = () => [...table.querySelectorAll<TableRow>("u-table-row:not([slot])")];
  await table.updateComplete;
  await Promise.all(rows().map((element) => element.updateComplete));
  await table.updateComplete;
  return {
    table,
    rows,
    header: (label: string) =>
      [...table.querySelectorAll<HTMLElement>("u-table-header-cell")].find((cell) =>
        cell.textContent!.includes(label),
      )!,
    ids: () => rows().map((element) => element.querySelector('[scope="row"]')!.textContent!.trim()),
  };
}

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Requests. On `u-sort`, the application sorts them with `sortRows()` and renders the rows again. The status cell holds a `u-badge`.",
      },
    },
  },
  render: () => {
    const host = document.createElement("div");
    const draw = (rows: readonly Request[]) =>
      render(
        html`<u-table label="Requests" @u-sort=${sort}>
          ${head}
          ${repeat(
            rows,
            (request) => request.id,
            (request) => row(request),
          )}
        </u-table>`,
        host,
      );
    const sort = (event: TableSortEvent) => draw(sortRows(requests, event, "en"));
    draw(requests);
    return host;
  },
  play: async ({ canvasElement }) => {
    const { table, header, ids } = await tableIn(canvasElement);
    expect(table.shadowRoot!.querySelector('[part~="caption"]')!.textContent!.trim()).toBe(
      "Requests",
    );
    expect(ids()).toEqual(["R-104", "R-087", "R-112", "R-099"]);

    const onSort = fn();
    table.addEventListener("u-sort", onSort);
    const cell = header("Amount");
    const button = () =>
      cell.shadowRoot!.querySelector<HTMLButtonElement>('[part~="sort-button"]')!;
    const th = () => cell.shadowRoot!.querySelector('[part~="header-cell"]')!;
    await userEvent.click(button());
    await waitFor(() => expect(th().getAttribute("aria-sort")).toBe("ascending"));
    expect(onSort).toHaveBeenCalledOnce();
    expect(ids()).toEqual(["R-112", "R-099", "R-104", "R-087"]);

    await userEvent.click(button());
    await waitFor(() => expect(th().getAttribute("aria-sort")).toBe("descending"));
    expect(ids()).toEqual(["R-087", "R-104", "R-099", "R-112"]);
    // A single column has aria-sort.
    const sorted = [...table.querySelectorAll("u-table-header-cell")].filter((element) =>
      element.shadowRoot!.querySelector("[aria-sort]"),
    );
    expect(sorted).toHaveLength(1);
  },
});

export const CustomRows = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "Rows of any shape: a group heading across the columns, and a row of details under a request, shown by a button of the application. `colspan` spans a cell over the columns.",
      },
    },
  },
  render: () => {
    const host = document.createElement("div");
    const open = new Set<string>();
    const toggle = (id: string) => {
      if (!open.delete(id)) {
        open.add(id);
      }
      draw();
    };
    const group = (label: string, rows: Request[]) => html`
      <u-table-row>
        <u-table-header-cell scope="row" colspan="6">${label}</u-table-header-cell>
      </u-table-row>
      ${rows.map(
        (request) => html`
          ${row(
            request,
            html` <u-button
              size="small"
              variant="secondary"
              aria-expanded=${String(open.has(request.id))}
              aria-controls="details-${request.id}"
              @click=${() => toggle(request.id)}
              >Details</u-button
            >`,
          )}
          <u-table-row id="details-${request.id}" ?hidden=${!open.has(request.id)}>
            <u-table-cell colspan="6">
              ${request.applicant} asked for ${request.subject.toLowerCase()} on
              ${date.format(request.date)}. The file holds 3 supporting documents.
            </u-table-cell>
          </u-table-row>
        `,
      )}
    `;
    const draw = () =>
      render(
        html`<u-table label="Requests by month">
          ${head} ${group("October 2026", [requests[0]!, requests[2]!])}
          ${group("September 2026", [requests[1]!, requests[3]!])}
        </u-table>`,
        host,
      );
    draw();
    return host;
  },
  play: async ({ canvasElement }) => {
    const { table } = await tableIn(canvasElement);
    const details = table.querySelector<TableRow>("#details-R-104")!;
    expect(details.hidden).toBe(true);
    const button = [...table.querySelectorAll("u-button")][0]!;
    await userEvent.click(button);
    await waitFor(() => expect(details.hidden).toBe(false));
    expect(button.getAttribute("aria-expanded")).toBe("true");
    // The details span the width of the table.
    const cell = details.querySelector("u-table-cell")!.shadowRoot!.querySelector("td")!;
    const width = table.shadowRoot!.querySelector('[part~="table"]')!.getBoundingClientRect().width;
    expect(cell.getBoundingClientRect().width).toBeGreaterThan(width * 0.95);
    expect(cell.getAttribute("aria-colspan")).toBe("6");
  },
});

export const Selectable = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`selectable`: a `u-checkbox` starts each row, named by `selectMessage` and its row header, and one in the head selects every row. `values` holds the `value` of the rows selected; each choice fires `change`.",
      },
    },
  },
  render: () => html`
    <u-table label="Requests" selectable>
      ${head} ${requests.map((request) => row(request))}
    </u-table>
  `,
  play: async ({ canvasElement }) => {
    const { table, rows } = await tableIn(canvasElement);
    const onChange = fn();
    table.addEventListener("change", onChange);
    const boxOf = (element: TableRow) =>
      element.shadowRoot!.querySelector<Checkbox>('[part~="select"]')!;
    const all = boxOf(table.querySelector<TableRow>('u-table-row[slot="head"]')!);
    const second = boxOf(rows()[1]!);
    await second.updateComplete;
    expect(second.label).toBe("Select R-087");
    expect(second.labelHidden).toBe(true);
    expect(all.label).toBe("Select all rows");

    await userEvent.click(second.shadowRoot!.querySelector("input")!);
    await waitFor(() => expect(table.values).toEqual(["R-087"]));
    await waitFor(() => expect(rows()[1]!.getAttribute("aria-selected")).toBe("true"));
    await waitFor(() => expect(all.indeterminate).toBe(true));

    await userEvent.click(all.shadowRoot!.querySelector("input")!);
    await waitFor(() => expect(table.values).toEqual(["R-104", "R-087", "R-112", "R-099"]));
    await waitFor(() => expect(all.checked).toBe(true));
    await userEvent.click(all.shadowRoot!.querySelector("input")!);
    await waitFor(() => expect(table.values).toEqual([]));
    expect(onChange).toHaveBeenCalledTimes(3);
  },
});

export const Empty = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Without rows in its body: the `empty` slot, under the header.",
      },
    },
  },
  render: () => html`
    <u-table label="Requests">
      ${head}
      <p slot="empty">No request yet.</p>
    </u-table>
  `,
  play: async ({ canvasElement }) => {
    const { table } = await tableIn(canvasElement);
    expect(table.shadowRoot!.querySelector<HTMLElement>('[part~="empty"]')!.hidden).toBe(false);
  },
});

export const Loading = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "`loading` while the application loads new rows from its server: the rows stay, dimmed, the table is `aria-busy`, and a spinner named by `loading-label` shows over them. Without rows, it takes the place of the empty message.",
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem">
      <u-table label="Requests" loading>${head} ${requests.map((request) => row(request))}</u-table>
      <u-table label="Archive" loading loading-label="Chargement…">
        ${head}
        <p slot="empty">No request yet.</p>
      </u-table>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [withRows, empty] = [...canvasElement.querySelectorAll<Table>("u-table")];
    await withRows!.updateComplete;
    await empty!.updateComplete;
    const part = (table: Table, name: string) =>
      table.shadowRoot!.querySelector<HTMLElement>(`[part~="${name}"]`)!;
    expect(part(withRows!, "table").getAttribute("aria-busy")).toBe("true");
    await expect(
      part(withRows!, "spinner").shadowRoot!.querySelector("[role=progressbar]"),
    ).toHaveAccessibleName("Loading…");
    // Without rows: the spinner in place of the empty message.
    expect(part(empty!, "empty").hidden).toBe(true);
    expect(part(empty!, "loading").hidden).toBe(false);
    // Loaded: the table is no longer busy.
    withRows!.loading = false;
    await withRows!.updateComplete;
    expect(part(withRows!, "table").hasAttribute("aria-busy")).toBe(false);
    expect(part(withRows!, "loading").hidden).toBe(true);
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
      <u-table label="Requests" style="--u-table-max-block-size: 16rem">
        ${head} ${many.map((request) => row(request))}
      </u-table>
    `;
  },
  play: async ({ canvasElement }) => {
    const { table } = await tableIn(canvasElement);
    const scroller = table.shadowRoot!.querySelector<HTMLElement>('[part~="scroller"]')!;
    await waitFor(() => expect(scroller.getAttribute("tabindex")).toBe("0"));
    expect(scroller.getAttribute("role")).toBe("region");
    scroller.scrollTop = 200;
    const th = table
      .querySelector("u-table-header-cell")!
      .shadowRoot!.querySelector("th")!
      .getBoundingClientRect();
    expect(Math.abs(th.top - scroller.getBoundingClientRect().top)).toBeLessThan(2);
  },
});
