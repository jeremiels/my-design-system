import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";
import type { Guideline, GuidelineCheck, GuidelineLevel, TokenCombo } from "./model.ts";

/** What the DSDS documents of a design system say of one of its components. */
export interface ComponentUsage {
  /** What it is, in a sentence. */
  readonly description?: string;
  readonly guidelines: readonly Guideline[];
}

/** The usage of each documented component, by component name. */
export type UsageDocs = ReadonlyMap<string, ComponentUsage>;

/** What the DSDS documents of a design system say of one of its tokens (ADR 0046). */
export interface TokenUsage {
  /** How to use it, in a sentence: the `description` of its entry. */
  readonly description?: string;
  readonly guidelines: readonly Guideline[];
  /** The tokens it goes with, or never with. */
  readonly combos: readonly TokenCombo[];
  /**
   * Whether the entry is a group's (`kind: entry` with `metadata.group`, ADR
   * 0050): its rules apply to every token of the group.
   */
  readonly group?: boolean;
}

/** The usage of each documented token, by token ID. */
export type TokenUsageDocs = ReadonlyMap<string, TokenUsage>;

/** The namespace of the base's own data in DSDS `$extensions`. */
export const EXTENSIONS_NAMESPACE = "dev.unicorne";

// The few shapes of a DSDS document this module reads.
interface Extensions {
  [namespace: string]: { audience?: string; check?: Record<string, unknown> } | undefined;
}
interface DsdsItem {
  level?: string;
  statement?: string;
  alternatives?: { to?: string }[];
  checkedBy?: string;
  checks?: ({ href?: string; role?: string } | string)[];
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
interface DsdsCombo {
  subject?: string;
  level?: string;
  items?: string[];
  note?: string;
}
interface DsdsEntry {
  kind?: string;
  id?: string;
  description?: string;
  sections?: DsdsSection[];
  combos?: DsdsCombo[];
  metadata?: { group?: string };
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

/**
 * The rule of `check` an item turns on: its `checks` pointer with
 * `role: lint-rule`, whose fragment is the id of the rule, and the options
 * of its extensions.
 */
function checkOf(item: DsdsItem): GuidelineCheck | undefined {
  for (const pointer of item.checks ?? []) {
    if (typeof pointer === "string" || pointer.role !== "lint-rule" || !pointer.href) {
      continue;
    }
    const rule = pointer.href.split("#")[1];
    if (rule) {
      return { rule, options: item.$extensions?.[EXTENSIONS_NAMESPACE]?.check ?? {} };
    }
  }
  return undefined;
}

/** The usage of the component entries of a document, merged into `usage`. */
function collect(document: DsdsEntry, usage: Map<string, ComponentUsage>): void {
  if (document.kind !== "component" || !document.id) {
    return;
  }
  usage.set(document.id, {
    ...(document.description ? { description: document.description.trim() } : {}),
    guidelines: guidelinesOf(document),
  });
}

/** A token reference of a combo, without its braces: `{color.surface.default}`. */
const tokenOf = (target: string) => /^\{(.+)\}$/.exec(target)?.[1];

/**
 * The usage of the token entries of a document, merged into `usage`: their
 * rules, and their combos, on the token each combo names as its subject.
 */
function collectToken(entry: DsdsEntry, usage: Map<string, TokenUsage>): void {
  // A group's entry: its rules, for every token of the group.
  const group = entry.kind === "entry" ? entry.metadata?.group : undefined;
  if (group) {
    usage.set(group, {
      ...(entry.description ? { description: entry.description.trim() } : {}),
      guidelines: guidelinesOf(entry),
      combos: [],
      group: true,
    });
    return;
  }
  if (entry.kind !== "token" || !entry.id) {
    return;
  }
  const own = usage.get(entry.id);
  usage.set(entry.id, {
    ...own,
    ...(entry.description ? { description: entry.description.trim() } : {}),
    guidelines: [...(own?.guidelines ?? []), ...guidelinesOf(entry)],
    combos: own?.combos ?? [],
  });
  for (const combo of entry.combos ?? []) {
    const subject = combo.subject && tokenOf(combo.subject);
    const items = (combo.items ?? []).flatMap((item) => tokenOf(item) ?? []);
    if (!subject || !combo.level || !LEVELS.has(combo.level) || items.length === 0) {
      continue;
    }
    const target = usage.get(subject) ?? { guidelines: [], combos: [] };
    usage.set(subject, {
      ...target,
      combos: [
        ...target.combos,
        {
          level: combo.level as GuidelineLevel,
          items,
          ...(combo.note ? { note: combo.note } : {}),
        },
      ],
    });
  }
}

/** The rules of the guidelines sections of an entry. */
function guidelinesOf(document: DsdsEntry): Guideline[] {
  const guidelines: Guideline[] = [];
  for (const section of document.sections ?? []) {
    if (section.kind !== "guidelines") {
      continue;
    }
    for (const item of section.items ?? []) {
      if (!item.statement || !item.level || !LEVELS.has(item.level)) {
        continue;
      }
      const check = checkOf(item);
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
        ...(check ? { check } : {}),
      });
    }
  }
  return guidelines;
}

/**
 * Every entry of a DSDS document and of the documents its `refs` with
 * `rel: file` point at, relative to it.
 */
async function readEntries(file: string): Promise<DsdsEntry[]> {
  const entries: DsdsEntry[] = [];
  const visited = new Set<string>();
  const visit = async (path: string) => {
    if (visited.has(path)) {
      return;
    }
    visited.add(path);
    const document = parse(await readFile(path, "utf8")) as DsdsDocument;
    entries.push(document, ...(document.entries ?? []));
    for (const ref of document.refs ?? []) {
      if (ref.rel === "file" && ref.href) {
        await visit(resolve(dirname(path), ref.href));
      }
    }
  };
  await visit(resolve(file));
  return entries;
}

/**
 * Reads a DSDS document and the documents its `refs` with `rel: file`
 * point at, relative to it: the root document of a design system, its
 * `design-system.dsds.yaml`, gives the usage of all its components.
 */
export async function readUsage(file: string): Promise<UsageDocs> {
  const usage = new Map<string, ComponentUsage>();
  for (const entry of await readEntries(file)) {
    collect(entry, usage);
  }
  return usage;
}

/**
 * The token entries of a DSDS document and of those it points at (ADR
 * 0046): how to use each token, and the tokens it goes with.
 */
export async function readTokenUsage(file: string): Promise<TokenUsageDocs> {
  const usage = new Map<string, TokenUsage>();
  for (const entry of await readEntries(file)) {
    collectToken(entry, usage);
  }
  return usage;
}
