import preview from "#.storybook/preview";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import type { TabPanel } from "../tab-panel/tab-panel";
import type { Tab } from "../tab/tab";
import type { Tabs } from "./tabs";

/** The tabs of the story, once rendered. */
async function tabsIn(canvasElement: HTMLElement) {
  const tabs = canvasElement.querySelector<Tabs>("u-tabs")!;
  const tabList = [...tabs.querySelectorAll<Tab>("u-tab")];
  const panels = [...tabs.querySelectorAll<TabPanel>("u-tab-panel")];
  await Promise.all([tabs, ...tabList, ...panels].map((element) => element.updateComplete));
  await tabs.updateComplete;
  return { tabs, tabList, panels };
}

const meta = preview.meta({
  title: "Components/Tabs",
  component: "u-tabs",
  subcomponents: { Tab: "u-tab", TabPanel: "u-tab-panel" },
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: { type: "select" }, options: ["horizontal", "vertical"] },
  },
  args: {
    value: "profile",
    orientation: "horizontal",
    label: "Account",
  },
  parameters: {
    a11y: { disable: false },
    docs: {
      description: {
        component:
          "The `u-tabs` component shows one panel at a time, under a list of tabs. Its `u-tab` and `u-tab-panel` children share a `value`. The arrow keys move through the tabs and show their panels.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Three tabs. A click or the arrow keys show another panel, and fire `change`.",
      },
    },
  },
  render: (args) => html`
    <u-tabs
      value=${ifDefined(args.value)}
      orientation=${ifDefined(args.orientation)}
      label=${ifDefined(args.label)}
    >
      <u-tab value="profile">Profile</u-tab>
      <u-tab value="security">Security</u-tab>
      <u-tab value="billing">Billing</u-tab>
      <u-tab-panel value="profile">Your name, your photo and your language.</u-tab-panel>
      <u-tab-panel value="security">Your password and your devices.</u-tab-panel>
      <u-tab-panel value="billing">Your plan and your invoices.</u-tab-panel>
    </u-tabs>
  `,
  play: async ({ canvasElement }) => {
    const { tabs, tabList, panels } = await tabsIn(canvasElement);
    expect(tabs.shadowRoot!.querySelector('[part~="tablist"]')).toHaveAccessibleName("Account");
    const onChange = fn();
    tabs.addEventListener("change", onChange);
    await userEvent.click(tabList[1]!);
    expect(tabs.value).toBe("security");
    expect(onChange).toHaveBeenCalledOnce();
    await waitFor(() => expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true]));
  },
});

export const VerticalWithDisabled = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          '`orientation="vertical"`: the tabs one below the other, ArrowUp and ArrowDown. A disabled tab is skipped.',
      },
    },
  },
  render: () => html`
    <u-tabs value="general" orientation="vertical" label="Settings">
      <u-tab value="general">General</u-tab>
      <u-tab value="beta" disabled>Beta</u-tab>
      <u-tab value="privacy">Privacy</u-tab>
      <u-tab-panel value="general">The settings that apply everywhere.</u-tab-panel>
      <u-tab-panel value="beta">Features to try.</u-tab-panel>
      <u-tab-panel value="privacy">Who sees what.</u-tab-panel>
    </u-tabs>
  `,
  play: async ({ canvasElement }) => {
    const { tabList } = await tabsIn(canvasElement);
    expect(tabList[1]!.getAttribute("aria-disabled")).toBe("true");
    expect(tabList.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  },
});

export const Overflow = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          "More tabs than the width holds: the list scrolls, and buttons at its edges scroll it for the pointer. Every tab stays in the list: the arrow keys bring it into view.",
      },
    },
  },
  render: () => html`
    <div style="max-inline-size: 22rem">
      <u-tabs value="january" label="Months">
        ${["January", "February", "March", "April", "May", "June", "July", "August"].map(
          (month) => html`<u-tab value=${month.toLowerCase()}>${month}</u-tab>`,
        )}
        ${["January", "February", "March", "April", "May", "June", "July", "August"].map(
          (month) =>
            html`<u-tab-panel value=${month.toLowerCase()}>The report of ${month}.</u-tab-panel>`,
        )}
      </u-tabs>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const { tabs, tabList } = await tabsIn(canvasElement);
    const root = tabs.shadowRoot!;
    await waitFor(() => expect(root.querySelector(".scroll--end")).not.toBeNull());
    expect(root.querySelector(".scroll--start")).toBeNull();
    expect(tabList).toHaveLength(8);
    await userEvent.click(root.querySelector<HTMLElement>(".scroll--end")!);
    await waitFor(() => expect(root.querySelector(".scroll--start")).not.toBeNull());
  },
});
