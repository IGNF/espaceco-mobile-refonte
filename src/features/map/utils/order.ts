/**
 * Remove duplicates and empty values while preserving original order.
 */
export function uniqueOrderedStrings(values: string[]): string[] {
  const uniqueValues: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) {
      continue;
    }

    if (!uniqueValues.includes(value)) {
      uniqueValues.push(value);
    }
  }

  return uniqueValues;
}

/**
 * Check if two orders are equal.
 * @param firstOrder First order to compare.
 * @param secondOrder Second order to compare.
 * @returns True if the orders are equal, false otherwise.
 */
export function areOrdersEqual(firstOrder: string[], secondOrder: string[]): boolean {
  if (firstOrder.length !== secondOrder.length) {
    return false;
  }

  return firstOrder.every((value, index) => value === secondOrder[index]);
}

/**
 * Return a new item list following the given order keys, then append leftovers.
 */
export function orderItemsByStringKey<T>(
  items: T[],
  getKey: (item: T) => string,
  orderedKeys: string[]
): T[] {
  const itemsByKey = new Map<string, T>();

  for (const item of items) {
    itemsByKey.set(getKey(item), item);
  }

  const orderedItems: T[] = [];

  for (const key of uniqueOrderedStrings(orderedKeys)) {
    const item = itemsByKey.get(key);
    if (!item) {
      continue;
    }

    orderedItems.push(item);
    itemsByKey.delete(key);
  }

  for (const item of itemsByKey.values()) {
    orderedItems.push(item);
  }

  return orderedItems;
}

export function moveStringKey(
  orderedKeys: string[],
  keyToMove: string,
  targetIndex: number
): string[] {
  const sourceIndex = orderedKeys.indexOf(keyToMove);

  if (sourceIndex < 0 || sourceIndex === targetIndex) {
    return orderedKeys;
  }

  const nextOrderedKeys = [...orderedKeys];
  const [movedKey] = nextOrderedKeys.splice(sourceIndex, 1);
  nextOrderedKeys.splice(targetIndex, 0, movedKey);

  return nextOrderedKeys;
}
