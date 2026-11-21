import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent } from "storybook/test";
import type { Button } from "../button/button";
import type { Pagination } from "./pagination";

const meta = preview.meta({
  title: "Components/Pagination",
  component: "u-pagination",
  tags: ["autodocs"],
  args: {
    page: 6,
    pages: 12,
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-pagination` component moves through the pages of a list. It shows the first and last pages, the current one and its neighbours. A click sets `page` and fires `change`; a live region announces the new page.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "Page 6 of 12. The gaps stand for the pages left out." },
    },
  },
  render: (args) => html`<u-pagination page=${args.page} pages=${args.pages}></u-pagination>`,
  play: async ({ canvasElement }) => {
    const pagination = canvasElement.querySelector<Pagination>("u-pagination")!;
    await pagination.updateComplete;
    const onChange = fn();
    pagination.addEventListener("change", onChange);
    // Its buttons are `u-button` elements; the native control carries the name.
    const next = pagination.shadowRoot!.querySelector<Button>(".button--next")!;
    await next.updateComplete;
    await expect(next.shadowRoot!.querySelector("button")!).toHaveAccessibleName("Next page");
    await userEvent.click(next);
    expect(pagination.page).toBe(7);
    expect(onChange).toHaveBeenCalledOnce();
  },
});

export const Ends = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "On the first page, the previous button is disabled; with few pages, they all show. Several paginations on a page each have their own `label`.",
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem">
      <u-pagination page="1" pages="20" label="Pages of the results"></u-pagination>
      <u-pagination page="3" pages="4" label="Pages of the orders"></u-pagination>
      <u-pagination page="2" pages="5" dir="rtl" lang="ar" label="ترقيم الصفحات"></u-pagination>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [first] = [...canvasElement.querySelectorAll<Pagination>("u-pagination")];
    await first!.updateComplete;
    expect(first!.shadowRoot!.querySelector<HTMLButtonElement>(".button--previous")!.disabled).toBe(
      true,
    );
  },
});
