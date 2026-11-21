// A tree: the ARIA tree view, its keys, the choice, typeahead. Chromium.
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import "../../define.js";
import type { TreeItem } from "../tree-item/tree-item.js";
import type { Tree } from "./tree.js";

async function mount(attributes = "") {
  document.body.innerHTML = `
    <button id="before">Before</button>
    <u-tree label="Files" ${attributes}>
      <u-tree-item label="Documents" value="docs" expanded>
        <u-tree-item label="Report" value="report"></u-tree-item>
        <u-tree-item label="Archive" value="archive">
          <u-tree-item label="Old" value="old"></u-tree-item>
        </u-tree-item>
      </u-tree-item>
      <u-tree-item label="Pictures" value="pictures"></u-tree-item>
    </u-tree>`;
  const tree = document.querySelector<Tree>("u-tree")!;
  const items = Object.fromEntries(
    Array.from(tree.querySelectorAll<TreeItem>("u-tree-item"), (item) => [item.value, item]),
  );
  await Promise.all([tree, ...Object.values(items)].map((element) => element.updateComplete));
  await tree.updateComplete;
  const changes: string[] = [];
  tree.addEventListener("change", () => changes.push(tree.value));
  const focused = () => (document.activeElement as TreeItem | null)?.value;
  return { tree, items, changes, focused };
}

afterEach(() => {
  document.body.replaceChildren();
});

it("is a named tree of items with their level and state", async () => {
  const { tree, items } = await mount('value="report"');
  await expect
    .element(tree.shadowRoot!.querySelector<HTMLElement>('[part~="tree"]')!)
    .toHaveRole("tree");
  await expect.element(items.report!).toHaveRole("treeitem");
  await expect.element(items.report!).toHaveAccessibleName("Report");
  expect(items.report!.getAttribute("aria-level")).toBe("2");
  expect(items.report!.getAttribute("aria-selected")).toBe("true");
  expect(items.docs!.getAttribute("aria-expanded")).toBe("true");
  expect(items.archive!.getAttribute("aria-expanded")).toBe("false");
  expect(items.pictures!.hasAttribute("aria-expanded")).toBe(false);
});

it("moves between the items that show, opens and closes with the side arrows", async () => {
  const { items, focused } = await mount();
  document.querySelector<HTMLElement>("#before")!.focus();
  await userEvent.keyboard("{Tab}");
  expect(focused()).toBe("docs");
  await userEvent.keyboard("{ArrowDown}{ArrowDown}");
  expect(focused()).toBe("archive");
  await userEvent.keyboard("{ArrowRight}");
  expect(items.archive!.expanded).toBe(true);
  await userEvent.keyboard("{ArrowRight}");
  expect(focused()).toBe("old");
  await userEvent.keyboard("{ArrowLeft}");
  expect(focused()).toBe("archive");
  await userEvent.keyboard("{ArrowLeft}");
  expect(items.archive!.expanded).toBe(false);
  await userEvent.keyboard("{End}");
  expect(focused()).toBe("pictures");
  await userEvent.keyboard("r");
  expect(focused()).toBe("report");
});

it("chooses with Enter or a click, and opens with a click on the chevron", async () => {
  const { tree, items, changes } = await mount();
  items.pictures!.focus();
  await userEvent.keyboard("{Enter}");
  expect(tree.value).toBe("pictures");
  await userEvent.click(items.archive!.shadowRoot!.querySelector('[part~="toggle"]')!);
  expect(items.archive!.expanded).toBe(true);
  expect(tree.value).toBe("pictures");
  await userEvent.click(items.report!.shadowRoot!.querySelector('[part~="row"]')!);
  expect(changes).toEqual(["pictures", "report"]);
});
