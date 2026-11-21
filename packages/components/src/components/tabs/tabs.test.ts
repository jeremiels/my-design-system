// Tabs: the ARIA pattern, the roving tabindex, automatic activation, the
// real keyboard. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { TabPanel } from "../tab-panel/tab-panel.js";
import type { Tab } from "../tab/tab.js";
import type { Tabs } from "./tabs.js";

async function mount(attributes = "", disabled = "") {
  document.body.innerHTML = `
    <button id="before">Before</button>
    <u-tabs ${attributes}>
      <u-tab value="a">Profile</u-tab>
      <u-tab value="b" ${disabled}>Security</u-tab>
      <u-tab value="c">Billing</u-tab>
      <u-tab-panel value="a">Profile panel</u-tab-panel>
      <u-tab-panel value="b">Security panel</u-tab-panel>
      <u-tab-panel value="c">Billing panel</u-tab-panel>
    </u-tabs>`;
  const tabs = document.querySelector<Tabs>("u-tabs")!;
  const tabList = Array.from(tabs.querySelectorAll<Tab>("u-tab"));
  const panels = Array.from(tabs.querySelectorAll<TabPanel>("u-tab-panel"));
  await Promise.all([tabs, ...tabList, ...panels].map((element) => element.updateComplete));
  await tabs.updateComplete;
  const changes: string[] = [];
  tabs.addEventListener("change", () => changes.push(tabs.value));
  const shown = () => panels.filter((panel) => !panel.hidden).map((panel) => panel.value);
  return { tabs, tabList, panels, changes, shown };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("selects the first enabled tab without a value, and links tabs and panels", async () => {
  const { tabs, tabList, panels, shown } = await mount();
  await expect
    .element(tabs.shadowRoot!.querySelector<HTMLElement>('[part~="tablist"]')!)
    .toHaveRole("tablist");
  await expect.element(tabList[0]!).toHaveRole("tab");
  expect(tabList.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
    "true",
    "false",
    "false",
  ]);
  expect(shown()).toEqual(["a"]);
  expect(tabList[0]!.getAttribute("aria-controls")).toBe(panels[0]!.id);
  await expect.element(panels[0]!).toHaveRole("tabpanel");
  await expect.element(panels[0]!).toHaveAccessibleName("Profile");
});

it("is reached by Tab on its selected tab, then its panel", async () => {
  await mount('value="c"');
  document.querySelector<HTMLElement>("#before")!.focus();
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement?.textContent).toBe("Billing");
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement?.textContent).toBe("Billing panel");
});

it("selects with the arrows, skipping a disabled tab, and with Home and End", async () => {
  const { tabList, changes, shown } = await mount('value="a"', "disabled");
  tabList[0]!.focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(document.activeElement).toBe(tabList[2]);
  expect(shown()).toEqual(["c"]);
  await userEvent.keyboard("{Home}");
  expect(shown()).toEqual(["a"]);
  await userEvent.keyboard("{End}");
  expect(changes).toEqual(["c", "a", "c"]);
});

it("selects on a click, and follows the arrows of its orientation", async () => {
  const { tabs, tabList, shown } = await mount('orientation="vertical"');
  await userEvent.click(tabList[1]!);
  expect(tabs.value).toBe("b");
  await userEvent.keyboard("{ArrowRight}");
  expect(tabs.value).toBe("b");
  await userEvent.keyboard("{ArrowDown}");
  expect(shown()).toEqual(["c"]);
});

it("fires no change for a value set by the application", async () => {
  const { tabs, changes, shown } = await mount();
  tabs.value = "b";
  await tabs.updateComplete;
  expect(shown()).toEqual(["b"]);
  expect(changes).toEqual([]);
});
