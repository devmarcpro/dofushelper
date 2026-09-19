import { describe, expect, it } from 'vitest';
import iceDofus from '../../tests/fixtures/item-7043-dofus-des-glaces.json';
import type { CompiledDataset } from '../core/dataset';
import { buildSearchIndex, normalize, search, type SearchEntry } from './search';

const entry = (kind: SearchEntry['kind'], id: number, name: string): SearchEntry => ({
  kind,
  id,
  name,
  level: null,
  norm: normalize(name),
});

/** Synthetic names only (FAKE, ids ≥ 9 000 000). */
const index: SearchEntry[] = [
  entry('quest', 9000001, 'FAKE La forêt enchantée'),
  entry('quest', 9000002, 'FAKE Forêt'),
  entry('achievement', 9000201, 'FAKE Gardien de la forêt'),
  entry('goal', 9100001, 'FAKE Œuf d’émeraude'),
];

describe('normalize', () => {
  it('drops accents, case, apostrophes and extra spaces', () => {
    expect(normalize("  L’Île  d'Émeraude ")).toBe('l ile d emeraude');
  });
});

describe('search', () => {
  it('returns nothing for an empty query', () => {
    expect(search(index, '   ')).toEqual([]);
  });

  it('matches without accents and requires every word', () => {
    expect(search(index, 'foret').map((e) => e.id)).toEqual([9000002, 9000001, 9000201]);
    expect(search(index, 'foret gardien').map((e) => e.id)).toEqual([9000201]);
    expect(search(index, 'foret dragon')).toEqual([]);
  });

  it('ranks an exact name, then a prefix, then shorter names', () => {
    expect(search(index, 'fake foret')[0]?.id).toBe(9000002);
    expect(search(index, 'fake').map((e) => e.id)).toEqual([9000002, 9100001, 9000001, 9000201]);
  });

  it('filters by kind and limits the results', () => {
    expect(search(index, 'fake', { kinds: ['achievement'] }).map((e) => e.id)).toEqual([9000201]);
    expect(search(index, 'fake', { limit: 2 })).toHaveLength(2);
  });
});

describe('buildSearchIndex on a real fixture', () => {
  const real = buildSearchIndex(iceDofus.dataset as unknown as CompiledDataset);

  it('indexes quests, achievements and catalog goals', () => {
    expect(real.filter((e) => e.kind === 'quest')).toHaveLength(43);
    expect(real.filter((e) => e.kind === 'achievement')).toHaveLength(7);
    expect(real.filter((e) => e.kind === 'goal')).toHaveLength(1);
  });

  it('finds the Ice Dofus quest and goal by a partial, unaccented name', () => {
    const hits = search(real, 'dofus glaces');
    expect(hits.map((e) => `${e.kind}:${e.id}`)).toEqual(
      expect.arrayContaining(['goal:7043', 'quest:1329']),
    );
  });
});
