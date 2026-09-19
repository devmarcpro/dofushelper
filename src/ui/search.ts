/** Global search (M4): a pure index over quests, achievements and catalog goals. */
import type { CompiledDataset } from '../core/dataset';

export type SearchKind = 'goal' | 'quest' | 'achievement';

export interface SearchEntry {
  kind: SearchKind;
  id: number;
  name: string;
  level: number | null;
  /** Lower-case, accent-free name used for matching. */
  norm: string;
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchIndex(
  dataset: Pick<CompiledDataset, 'quests' | 'achievements' | 'goals'>,
): SearchEntry[] {
  const entry = (
    kind: SearchKind,
    id: number,
    name: string,
    level: number | null,
  ): SearchEntry[] => (name.length > 0 ? [{ kind, id, name, level, norm: normalize(name) }] : []);
  return [
    ...dataset.goals.flatMap((g) => entry('goal', g.goal.itemId, g.name, g.level)),
    ...dataset.quests.flatMap((q) =>
      entry('quest', q.id, q.name, q.levelMin > 0 ? q.levelMin : null),
    ),
    ...dataset.achievements.flatMap((a) => entry('achievement', a.id, a.name, a.level)),
  ];
}

export interface SearchOptions {
  kinds?: readonly SearchKind[];
  limit?: number;
}

/** Every word of the query must appear. Names starting with the query come first, then shorter names. */
export function search(
  index: readonly SearchEntry[],
  query: string,
  options: SearchOptions = {},
): SearchEntry[] {
  const needle = normalize(query);
  if (needle.length === 0) return [];
  const words = needle.split(' ');
  const kinds = options.kinds;
  const matches = index.filter(
    (e) => (!kinds || kinds.includes(e.kind)) && words.every((w) => e.norm.includes(w)),
  );
  const rank = (e: SearchEntry): number =>
    e.norm === needle ? 0 : e.norm.startsWith(needle) ? 1 : 2;
  matches.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.norm.length - b.norm.length ||
      a.norm.localeCompare(b.norm) ||
      a.id - b.id,
  );
  return matches.slice(0, options.limit ?? 50);
}
