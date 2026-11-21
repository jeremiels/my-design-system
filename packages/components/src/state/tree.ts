/**
 * The nodes of a tree, without DOM nor Lit (ADR 0010): which nodes show,
 * in order, and the parent of a node. `Tree` reads its items as nodes.
 */

/** What the tree needs to know of a node. */
export interface TreeNode {
  /** Its children show. Meaningful only with children. */
  readonly expanded?: boolean;
  readonly children: readonly TreeNode[];
}

/** The nodes that show, in reading order: the roots, and the children of the expanded ones. */
export function visibleNodes<T extends TreeNode>(roots: readonly T[]): T[] {
  return roots.flatMap((node) => [
    node,
    ...(node.expanded ? visibleNodes(node.children as readonly T[]) : []),
  ]);
}

/** The parent of `node`, `undefined` for a root or a node outside the tree. */
export function parentOf<T extends TreeNode>(roots: readonly T[], node: T): T | undefined {
  for (const root of roots) {
    if (root.children.includes(node)) {
      return root;
    }
    const parent = parentOf(root.children as readonly T[], node);
    if (parent) {
      return parent;
    }
  }
  return undefined;
}
