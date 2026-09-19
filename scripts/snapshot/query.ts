/** URL builder for the FeathersJS query syntax used by DofusDB (DATA_SOURCES.md §2.2). */

export const PAGE_SIZE = 50;

export interface ListQuery {
  /** Equality filters, e.g. { typeId: '23' }. */
  filters?: Record<string, string | number>;
  /** `field[$in][]=…` filter. */
  inField?: string;
  inValues?: readonly number[];
  select?: readonly string[];
  limit: number;
  skip?: number;
  /** Sort by id ascending so that pagination is stable. Default true. */
  sortById?: boolean;
}

function enc(value: string | number): string {
  return encodeURIComponent(String(value));
}

export function buildListUrl(base: string, route: string, query: ListQuery): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query.filters ?? {}))
    parts.push(`${key}=${enc(value)}`);
  if (query.inField !== undefined) {
    for (const value of query.inValues ?? []) parts.push(`${query.inField}[$in][]=${enc(value)}`);
  }
  parts.push(`$limit=${query.limit}`);
  if (query.skip !== undefined && query.skip > 0) parts.push(`$skip=${query.skip}`);
  if (query.limit > 0 && (query.sortById ?? true)) parts.push('$sort[id]=1');
  if (query.limit > 0)
    for (const field of query.select ?? []) parts.push(`$select[]=${enc(field)}`);
  return `${base}${route}?${parts.join('&')}`;
}

/** Number of pages needed for `total` rows. */
export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return total <= 0 ? 0 : Math.ceil(total / pageSize);
}

/** Splits ids into sorted, de-duplicated chunks of at most `size`. */
export function chunkIds(ids: Iterable<number>, size: number = PAGE_SIZE): number[][] {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const chunks: number[][] = [];
  for (let i = 0; i < sorted.length; i += size) chunks.push(sorted.slice(i, i + size));
  return chunks;
}
