import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import type { Guideline, GuidelineLevel } from "./model.ts";

/** What the DSDS documents of a design system say of one of its components. */
export interface ComponentUsage {
  /** What it is, in a sentence. */
  readonly description?: string;
  readonly guidelines: readonly Guideline[];
}

/** The usage of each documented component, by component name. */
export type UsageDocs = ReadonlyMap<string, ComponentUsage>;

/** The namespace of the base's own data in DSDS `$extensions`. */
export const EXTENSIONS_NAMESPACE = "dev.unicorne";

// The few shapes of a DSDS document this module reads.
interface Extensions {
  [namespace: string]: { audience?: string } | undefined;
}
interface DsdsItem {
  level?: string;
  statement?: string;
  alternatives?: { to?: string }[];
  checkedBy?: string;
  $extensions?: Extensions;
}
interface DsdsSection {
  kind?: string;
  for?: string;
  framing?: string;
  title?: string;
  items?: DsdsItem[];
  $extensions?: Extensions;
}
interface DsdsEntry {
  kind?: string;
  id?: string;
  description?: string;
  sections?: DsdsSection[];
}
interface DsdsDocument extends DsdsEntry {
  entries?: DsdsEntry[];
  refs?: { href?: string; rel?: string }[];
}

const LEVELS = new Set(["must", "should", "may", "should-not", "must-not"]);

/** `<dsds:button>`, a link to another entry, as the name of the entry, in code. */
const plain = (statement: string) => statement.replace(/<dsds:([\w-]+)>/g, "`$1`");

/** Whether the base's extensions mark an item or a section for contributors. */
const forContributors = (extensions: Extensions | undefined) =>
  extensions?.[EXTENSIONS_NAMESPACE]?.audience === "contributors";

/** The usage of the component entries of a document, merged into `usage`. */
function collect(document: DsdsEntry, usage: Map<string, ComponentUsage>): void {
  if (document.kind !== "component" || !document.id) {
    return;
  }
  const guidelines: Guideline[] = [];
  for (const section of document.sections ?? []) {
    if (section.kind !== "guidelines") {
      continue;
    }
    for (const item of section.items ?? []) {
      if (!item.statement || !item.level || !LEVELS.has(item.level)) {
        continue;
      }
      guidelines.push({
        level: item.level as GuidelineLevel,
        statement: plain(item.statement),
        ...(section.title ? { section: section.title } : {}),
        framing: section.framing === "when-to-use" ? "when-to-use" : "how-to-use",
        audience: section.for === "agent" || section.for === "human" ? section.for : "all",
        scope:
          forContributors(section.$extensions) || forContributors(item.$extensions)
            ? "contributors"
            : "users",
        alternatives: (item.alternatives ?? []).flatMap(({ to }) => (to ? [to] : [])),
        ...(item.checkedBy ? { checkedBy: item.checkedBy } : {}),
      });
    }
  }
  usage.set(document.id, {
    ...(document.description ? { description: document.description.trim() } : {}),
    guidelines,
  });
}

/**
 * Reads a DSDS document and the documents its `refs` with `rel: file`
 * point at, relative to it: the root document of a design system, its
 * `design-system.dsds.yaml`, gives the usage of all its components.
 */
export async function readUsage(file: string): Promise<UsageDocs> {
  const usage = new Map<string, ComponentUsage>();
  const visited = new Set<string>();
  const visit = async (path: string) => {
    if (visited.has(path)) {
      return;
    }
    visited.add(path);
    const document = parse(await readFile(path, "utf8")) as DsdsDocument;
    collect(document, usage);
    for (const entry of document.entries ?? []) {
      collect(entry, usage);
    }
    for (const ref of document.refs ?? []) {
      if (ref.rel === "file" && ref.href) {
        await visit(resolve(dirname(path), ref.href));
      }
    }
  };
  await visit(resolve(file));
  return usage;
}
