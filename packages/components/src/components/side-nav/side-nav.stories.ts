import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent } from "storybook/test";
import type { SideNavItem } from "../side-nav-item/side-nav-item";
import type { SideNav } from "./side-nav";

const meta = preview.meta({
  title: "Components/Side nav",
  component: "u-side-nav",
  subcomponents: { SideNavItem: "u-side-nav-item" },
  tags: ["autodocs"],
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The pages of a section, beside the content: links in a list, and groups that open and close with a button (`aria-expanded`), as in the DSFR (ADR 0034). The item of the current page has `current`; the groups around it open.",
      },
    },
  },
});

const items = () => [...document.querySelectorAll<SideNavItem>("u-side-nav-item")];

export const Default = meta.story({
  render: () => html`
    <u-side-nav label="Requests" style="max-inline-size: 16rem">
      <u-side-nav-item label="Dashboard" href="#dashboard"></u-side-nav-item>
      <u-side-nav-item label="Requests">
        <u-side-nav-item label="Received" href="#received" current></u-side-nav-item>
        <u-side-nav-item label="Under review" href="#review"></u-side-nav-item>
        <u-side-nav-item label="Closed" href="#closed"></u-side-nav-item>
      </u-side-nav-item>
      <u-side-nav-item label="Reports">
        <u-side-nav-item label="Monthly" href="#monthly"></u-side-nav-item>
        <u-side-nav-item label="Yearly" href="#yearly"></u-side-nav-item>
      </u-side-nav-item>
      <u-side-nav-item label="Settings" href="#settings"></u-side-nav-item>
    </u-side-nav>
  `,
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector<SideNav>("u-side-nav")!;
    await nav.updateComplete;
    await Promise.all(items().map((item) => item.updateComplete));
    const [, requests, received, , , reports] = items();
    // The landmark, named by `label`.
    await expect(nav.shadowRoot!.querySelector("nav")!).toHaveAccessibleName("Requests");
    // The current page: its link, and its group open around it.
    expect(received!.shadowRoot!.querySelector("a")!.getAttribute("aria-current")).toBe("page");
    const toggle = (item: SideNavItem) => item.shadowRoot!.querySelector("button")!;
    expect(requests!.expanded).toBe(true);
    expect(toggle(requests!).getAttribute("aria-current")).toBe("true");
    expect(toggle(requests!).getAttribute("aria-expanded")).toBe("true");
    // Another group opens with its button.
    expect(reports!.expanded).toBe(false);
    const onToggle = fn();
    reports!.addEventListener("toggle", onToggle);
    toggle(reports!).focus();
    await userEvent.keyboard("{Enter}");
    await reports!.updateComplete;
    expect(toggle(reports!).getAttribute("aria-expanded")).toBe("true");
    expect(reports!.shadowRoot!.querySelector<HTMLElement>('[part~="group"]')!.hidden).toBe(false);
    expect(onToggle).toHaveBeenCalledOnce();
  },
});
