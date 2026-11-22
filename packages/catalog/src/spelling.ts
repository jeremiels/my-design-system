/**
 * The name a typo meant (ADR 0047): `primay` for `primary`, `varient` for
 * `variant`. The algorithm and its thresholds are TypeScript's "Did you
 * mean…?" (`getSpellingSuggestion()` of `src/compiler/core.ts`, TypeScript
 * 5.9.3, Apache-2.0): a check names what a person or an agent likely meant,
 * no more.
 */

/**
 * The cost of turning `a` into `b`: 1 per insertion or deletion, 2 per
 * substitution, 0.1 for a letter that only differs in case.
 */
export function spellingDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const same = a[i - 1] === b[j - 1];
      const caseOnly = !same && a[i - 1]!.toLowerCase() === b[j - 1]!.toLowerCase();
      current[j] = same
        ? previous[j - 1]!
        : Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (caseOnly ? 0.1 : 2));
    }
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The candidate `name` most likely misspells, or none: its length differs by
 * at most a third, and its distance stays under 0.4 of the name's length.
 * A name under 3 characters only matches a difference of case.
 */
export function spellingSuggestion(name: string, candidates: Iterable<string>): string | undefined {
  const maximumLengthDifference = Math.max(2, Math.floor(name.length * 0.34));
  let bestDistance = Math.floor(name.length * 0.4) + 1;
  let best: string | undefined;
  for (const candidate of candidates) {
    if (candidate === name || Math.abs(candidate.length - name.length) > maximumLengthDifference) {
      continue;
    }
    if (candidate.length < 3 && candidate.toLowerCase() !== name.toLowerCase()) {
      continue;
    }
    const distance = spellingDistance(name, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}
