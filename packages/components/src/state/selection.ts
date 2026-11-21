/**
 * The values chosen among items, without DOM nor Lit (ADR 0010): a select
 * with `multiple`, a tree. The values keep the order of the items.
 */

/** What a selection needs to know of an item. */
export interface SelectionItem {
  readonly value: string;
  readonly disabled?: boolean;
}

/** `values` in the order of `items`, without the values of no item. */
export function orderedValues(
  items: readonly SelectionItem[],
  values: readonly string[],
): string[] {
  const chosen = new Set(values);
  return items.filter((item) => chosen.has(item.value)).map((item) => item.value);
}

/**
 * Chooses `value` if it isn't chosen, or leaves it out if it is, in the order
 * of `items`. A disabled item doesn't change: the same array comes back.
 */
export function toggleValue(
  items: readonly SelectionItem[],
  values: readonly string[],
  value: string,
): readonly string[] {
  const item = items.find((candidate) => candidate.value === value);
  if (!item || item.disabled) {
    return values;
  }
  return values.includes(value)
    ? values.filter((chosen) => chosen !== value)
    : orderedValues(items, [...values, value]);
}

/**
 * Chooses every enabled item, or none of them when they are all chosen
 * already: a "select all" box. The disabled items keep their choice.
 */
export function toggleAll(
  items: readonly SelectionItem[],
  values: readonly string[],
): readonly string[] {
  const chosen = new Set(values);
  const enabled = items.filter((item) => !item.disabled);
  const all = enabled.length > 0 && enabled.every((item) => chosen.has(item.value));
  return items
    .filter((item) => (item.disabled ? chosen.has(item.value) : !all))
    .map((item) => item.value);
}
