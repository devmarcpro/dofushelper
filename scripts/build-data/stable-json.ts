/**
 * Deterministic JSON: object keys sorted recursively, arrays left in the order given
 * (the compiler sorts them by id). Two builds of the same snapshot are byte-identical,
 * so git diffs between two game versions stay readable (DATA_SOURCES.md §6).
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) sorted[key] = sortKeys(source[key]);
    }
    return sorted;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(sortKeys(value))}\n`;
}
