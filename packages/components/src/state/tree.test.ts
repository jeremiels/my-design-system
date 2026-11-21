// The nodes of a tree, without a browser (ADR 0010).
import { expect, it } from "vitest";
import { parentOf, visibleNodes, type TreeNode } from "./tree.ts";

interface Named extends TreeNode {
  readonly name: string;
  readonly children: readonly Named[];
}

const node = (name: string, children: Named[] = [], expanded = false): Named => ({
  name,
  children,
  expanded,
});

const leaf = node("report.pdf");
const docs = node("docs", [leaf], true);
const closed = node("archive", [node("old.pdf")]);
const roots = [node("home", [docs, closed], true), node("trash")];

it("shows the roots and the children of the expanded nodes, in order", () => {
  expect(visibleNodes(roots).map(({ name }) => name)).toEqual([
    "home",
    "docs",
    "report.pdf",
    "archive",
    "trash",
  ]);
});

it("finds the parent of a node", () => {
  expect(parentOf(roots, leaf)).toBe(docs);
  expect(parentOf(roots, roots[1]!)).toBeUndefined();
});
