import preview from "#.storybook/preview";
import { html } from "lit";
import { expect } from "storybook/test";
import type { Breadcrumb } from "./breadcrumb";

const meta = preview.meta({
  title: "Components/Breadcrumb",
  component: "u-breadcrumb",
  subcomponents: { BreadcrumbItem: "u-breadcrumb-item" },
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-breadcrumb` component lists the links to the pages above the current one, in a navigation landmark. Its last `u-breadcrumb-item` is the current page.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: { story: "Three levels: the last one is the current page, without a link." },
    },
  },
  render: () => html`
    <u-breadcrumb>
      <u-breadcrumb-item href="#home">Home</u-breadcrumb-item>
      <u-breadcrumb-item href="#orders">Orders</u-breadcrumb-item>
      <u-breadcrumb-item>Order 42</u-breadcrumb-item>
    </u-breadcrumb>
    <u-breadcrumb dir="rtl" lang="ar" label="مسار التنقل" style="margin-block-start: 1rem">
      <u-breadcrumb-item href="#home">الرئيسية</u-breadcrumb-item>
      <u-breadcrumb-item>الطلبات</u-breadcrumb-item>
    </u-breadcrumb>
  `,
  play: async ({ canvasElement }) => {
    const breadcrumb = canvasElement.querySelector<Breadcrumb>("u-breadcrumb")!;
    await breadcrumb.updateComplete;
    const last = breadcrumb.querySelector("u-breadcrumb-item:last-child")!;
    await (last as Breadcrumb).updateComplete;
    expect(last.shadowRoot!.querySelector('[part~="link"]')!.getAttribute("aria-current")).toBe(
      "page",
    );
  },
});
