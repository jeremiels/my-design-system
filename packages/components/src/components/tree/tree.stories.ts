import preview from "#.storybook/preview";
import { html } from "lit";
import { expect, fn, userEvent } from "storybook/test";
import type { TreeItem } from "../tree-item/tree-item";
import type { Tree } from "./tree";

const meta = preview.meta({
  title: "Components/Tree",
  component: "u-tree",
  subcomponents: { TreeItem: "u-tree-item" },
  tags: ["autodocs"],
  parameters: {
    a11y: {
      disable: false,
      // A tree item's content holds its children: its name is its label, not
      // all its text, as in the ARIA tree view. The rule compares the two.
      options: { rules: { "label-content-name-mismatch": { enabled: false } } },
    },
    docs: {
      description: {
        component:
          "The `u-tree` component shows items in levels, its `u-tree-item` children. The arrow keys move, open and close them; Enter or a click chooses one, and fires `change`.",
      },
    },
  },
});

export const Default = meta.story({
  parameters: {
    docs: {
      description: {
        story: "Folders and files. A click on a chevron opens or closes its folder.",
      },
    },
  },
  render: () => html`
    <u-tree label="Files" value="report">
      <u-tree-item label="Documents" value="docs" expanded>
        <u-tree-item label="Report" value="report"></u-tree-item>
        <u-tree-item label="Archive" value="archive">
          <u-tree-item label="2025" value="2025"></u-tree-item>
        </u-tree-item>
      </u-tree-item>
      <u-tree-item label="Pictures" value="pictures"></u-tree-item>
      <u-tree-item label="Shared with me" value="shared" disabled></u-tree-item>
    </u-tree>
  `,
  play: async ({ canvasElement }) => {
    const tree = canvasElement.querySelector<Tree>("u-tree")!;
    const items = [...tree.querySelectorAll<TreeItem>("u-tree-item")];
    await Promise.all([tree, ...items].map((element) => element.updateComplete));
    await tree.updateComplete;
    const onChange = fn();
    tree.addEventListener("change", onChange);
    const pictures = items.find((item) => item.value === "pictures")!;
    await userEvent.click(pictures.shadowRoot!.querySelector('[part~="row"]')!);
    expect(tree.value).toBe("pictures");
    expect(onChange).toHaveBeenCalledOnce();
  },
});
