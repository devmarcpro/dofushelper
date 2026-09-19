/**
 * Real fixtures extracted from the compiled dataset by `npm run data:fixture` (M1-5).
 * They must stay loadable and schema-valid; the engine tests of M2 build on them.
 */
import { describe, expect, it } from 'vitest';
import { validateDataset } from '../scripts/build-data/validate';
import { closure, goalRoots, indexDataset, prerequisiteKeys } from '../scripts/build-data/subgraph';
import type { CompiledDataset } from '../src/core/dataset';
import criteria from './fixtures/criteria.real.json';
import dotruche from './fixtures/item-15235-dotruche.json';
import iceDofus from './fixtures/item-7043-dofus-des-glaces.json';
import quest1329 from './fixtures/quest-1329-le-dofus-des-glaces.json';

const fixtures = [
  ['item-15235-dotruche', dotruche],
  ['quest-1329-le-dofus-des-glaces', quest1329],
  ['item-7043-dofus-des-glaces', iceDofus],
] as const;

describe('real fixtures', () => {
  it.each(fixtures)('%s loads and passes schema validation', (_name, fixture) => {
    const dataset = fixture.dataset as unknown as CompiledDataset;
    expect(fixture.gameVersion).toMatch(/^\d+(\.\d+)+$/);
    expect(validateDataset(dataset)).toEqual([]);
    expect(dataset.quests.length + dataset.achievements.length).toBeGreaterThan(0);
  });

  it.each(fixtures)(
    '%s is closed: every prerequisite of its nodes is inside the fixture',
    (_name, fixture) => {
      const dataset = fixture.dataset as unknown as CompiledDataset;
      const index = indexDataset(dataset);
      const roots = [
        ...dataset.quests.map((q) => `q:${q.id}` as const),
        ...dataset.achievements.map((a) => `a:${a.id}` as const),
      ];
      expect([...closure(index, roots).missing].sort()).toEqual([...fixture.missing].sort());
    },
  );
});

describe('quest 1329 « Le Dofus des Glaces »', () => {
  const dataset = quest1329.dataset as unknown as CompiledDataset;
  const quest = dataset.quests.find((q) => q.id === 1329);

  it('has 28 direct mandatory Qf prerequisites and one choice group of 3', () => {
    const req = quest?.start.req;
    expect(req?.t).toBe('all');
    if (req?.t !== 'all') return;
    expect(req.of.filter((r) => r.t === 'questDone')).toHaveLength(28);
    const groups = req.of.filter((r) => r.t === 'any');
    expect(groups).toHaveLength(1);
    const group = groups[0];
    expect(group ? prerequisiteKeys({ raw: '', req: group }) : []).toEqual([
      'q:710',
      'q:711',
      'q:1316',
    ]);
  });

  it('still matches the vector of DATA_SOURCES §5: the snapshot confirms the third-party cache', () => {
    const vector = criteria.vectors.find((v) => v.questId === 1329);
    expect(quest?.start.raw).toBe(vector?.criterion);
  });

  it('contains the three mutually exclusive alignment quests', () => {
    const ids = new Set(dataset.quests.map((q) => q.id));
    expect([710, 711, 1316].every((id) => ids.has(id))).toBe(true);
  });
});

describe('item 7043 « Dofus des Glaces »', () => {
  const dataset = iceDofus.dataset as unknown as CompiledDataset;

  it('is rewarded by an achievement, whose closure reaches quest 1329', () => {
    const roots = goalRoots(dataset, { t: 'item', itemId: 7043 });
    expect(roots).toEqual(['a:922']);
    expect(closure(indexDataset(dataset), roots).nodes.has('q:1329')).toBe(true);
  });
});

describe('item 15235 « Dotruche »: the smallest non-trivial Dofus plan', () => {
  it('has 5 nodes', () => {
    const dataset = dotruche.dataset as unknown as CompiledDataset;
    expect(dataset.quests.length + dataset.achievements.length).toBe(5);
  });
});
