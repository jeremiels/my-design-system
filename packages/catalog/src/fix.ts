import { checkMarkup, type CheckOptions } from "./check.ts";
import type { DesignSystemDocs, Diagnostic, Fix } from "./model.ts";

/**
 * The fixes of `check` (ADR 0045): the problems whose rule knows the one
 * change that fixes them. A safe fix keeps what the page shows in every
 * context; an unsafe one changes it, as the rule intends: a color token
 * follows the dark theme, a raw color doesn't.
 */

/** Options of `fixMarkup()`. */
export interface FixOptions extends CheckOptions {
  /** Whether to apply the unsafe fixes too. */
  readonly unsafe?: boolean;
}

/** What `fixMarkup()` gives: the fixed text, the number of fixes, the problems left. */
export interface FixResult {
  readonly output: string;
  readonly fixed: number;
  readonly diagnostics: readonly Diagnostic[];
}

/** The passes of `fixMarkup()`: a fix that overlaps another waits for the next pass, like ESLint's. */
const PASSES = 10;

/** Applies the fixes that don't overlap, the first first: the text, and how many applied. */
export function applyFixes(
  source: string,
  fixes: readonly Fix[],
): { output: string; applied: number } {
  const kept: Fix[] = [];
  for (const fix of [...fixes].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (kept.length === 0 || fix.start >= kept.at(-1)!.end) {
      kept.push(fix);
    }
  }
  let output = source;
  for (const fix of [...kept].reverse()) {
    output = output.slice(0, fix.start) + fix.text + output.slice(fix.end);
  }
  return { output, applied: kept.length };
}

/**
 * Fixes a file as `check` reads it: its safe fixes, and its unsafe ones with
 * `unsafe`. Checks again after each pass, until no fix applies.
 */
export function fixMarkup(
  docs: DesignSystemDocs,
  source: string,
  options: FixOptions = {},
): FixResult {
  let output = source;
  let fixed = 0;
  for (let pass = 0; pass < PASSES; pass += 1) {
    const fixes = checkMarkup(docs, output, options).flatMap(({ fix }) =>
      fix && (fix.safe || options.unsafe) ? [fix] : [],
    );
    const result = applyFixes(output, fixes);
    if (result.applied === 0) {
      break;
    }
    output = result.output;
    fixed += result.applied;
  }
  return { output, fixed, diagnostics: checkMarkup(docs, output, options) };
}
