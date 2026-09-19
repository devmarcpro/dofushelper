import { describe, expect, it } from 'vitest';
import iceDofus from '../../tests/fixtures/item-7043-dofus-des-glaces.json';
import quest1329 from '../../tests/fixtures/quest-1329-le-dofus-des-glaces.json';
import { compileCriterion } from './criterion';
import type { CompiledAchievement, CompiledDataset, CompiledQuest } from './dataset';
import { buildGraph } from './graph';
import { computeEffectiveDone } from './progress';

const noReward = { items: [], titles: [], ornaments: [], emotes: [], spells: [] };
const criterion = compileCriterion;

/** Synthetic nodes: ids ≥ 9 000 000 and FAKE names (CLAUDE.md, golden rule 4). */
function fakeQuest(id: number, start: string): CompiledQuest {
  return {
    id,
    name: `FAKE quête ${id}`,
    categoryId: 9600001,
    levelMin: 1,
    levelMax: 1,
    isDungeonQuest: false,
    isPartyQuest: false,
    isEvent: false,
    repeatType: 0,
    repeatLimit: 1,
    start: criterion(start),
    startPositions: [],
    steps: [],
    rewards: noReward,
    dbNeed: null,
  };
}

function fakeAchievement(
  id: number,
  criteria: string[],
  missingObjectiveIds: number[] = [],
): CompiledAchievement {
  return {
    id,
    name: `FAKE succès ${id}`,
    description: 'FAKE',
    categoryId: 9600002,
    points: 10,
    level: 1,
    order: 0,
    accountLinked: false,
    objectives: criteria.map((c, i) => ({
      id: id * 10 + i,
      name: 'FAKE',
      order: i,
      criterion: criterion(c),
    })),
    missingObjectiveIds,
    rewards: noReward,
    dbNeed: null,
  };
}

const real1329 = quest1329.dataset as unknown as CompiledDataset;
const realIce = iceDofus.dataset as unknown as CompiledDataset;
const progress = (doneQuests: number[], doneAchievements: number[] = []) => ({
  doneQuests,
  doneAchievements,
});

describe('buildGraph — real fixture, quest 1329', () => {
  const graph = buildGraph(real1329);
  const node = graph.nodes.get('q:1329');

  it('has 28 mandatory direct prerequisites and 3 alternatives', () => {
    expect(node?.mandatory).toHaveLength(28);
    expect(node?.alternative).toEqual(['q:710', 'q:711', 'q:1316']);
  });

  it('records the mutual exclusions of the alignment quests without creating edges', () => {
    const q710 = graph.nodes.get('q:710');
    expect(q710?.exclusions).toEqual(['q:711', 'q:1316']);
    expect(q710?.mandatory).not.toContain('q:711');
    expect(q710?.alternative).not.toContain('q:711');
  });

  it('builds the reverse index', () => {
    expect(graph.unlocks.get('q:1317')).toContain('q:1329');
    expect(graph.unlocks.get('q:710')).toEqual(expect.arrayContaining(['q:1317', 'q:1329']));
  });

  it('has no missing node: the fixture is closed', () => {
    expect([...graph.missing.keys()]).toEqual([]);
  });
});

describe('computeEffectiveDone — real fixture, quest 1329', () => {
  const graph = buildGraph(real1329);

  it('ticking 1329 implies its 28 mandatory prerequisites and their own prerequisites', () => {
    const done = computeEffectiveDone(graph, progress([1329]));
    const node = graph.nodes.get('q:1329');
    for (const key of node?.mandatory ?? []) expect(done.effective.has(key)).toBe(true);
    expect(done.explicit).toEqual(new Set(['q:1329']));
    expect(done.implied.size).toBeGreaterThan(28);
    expect(done.implied.get('q:1317')).toBe('q:1329');
  });

  it('never implies a branch of the choice point', () => {
    const done = computeEffectiveDone(graph, progress([1329]));
    for (const key of ['q:710', 'q:711', 'q:1316'] as const)
      expect(done.effective.has(key)).toBe(false);
  });

  it('implies nothing when nothing is ticked', () => {
    const done = computeEffectiveDone(graph, progress([]));
    expect(done.effective.size).toBe(0);
  });
});

describe('computeEffectiveDone — real fixture, Dofus des Glaces (achievements as nodes)', () => {
  const graph = buildGraph(realIce);

  it('achievement 922 is deducible: its objectives are six other achievements', () => {
    const node = graph.nodes.get('a:922');
    expect(node?.deducible).toBe(true);
    expect(node?.mandatory).toEqual(['a:551', 'a:552', 'a:553', 'a:554', 'a:920', 'a:921']);
  });

  it('ticking achievement 922 implies the whole chain down to quest 1329', () => {
    const done = computeEffectiveDone(graph, progress([], [922]));
    expect(done.effective.has('q:1329')).toBe(true);
  });
});

describe('buildGraph and computeEffectiveDone — synthetic cases', () => {
  const dataset = {
    quests: [
      fakeQuest(9000001, 'BT=1'),
      fakeQuest(9000002, 'PL>9&Qf=9000001'),
      fakeQuest(9000003, 'Qf=9000002&(Qf=9000001|Qf=9000004)&Qf!9000005'),
      fakeQuest(9000004, 'Qf=9000003'), // cycle 3 ↔ 4 through an alternative edge
      fakeQuest(9000005, 'Qf=9000005&Qf=9099999'), // requires itself and a missing quest
      fakeQuest(9000006, 'PL>>'), // does not parse
      fakeQuest(9000007, 'Qf=9000008'),
      fakeQuest(9000008, 'Qf=9000007'), // mandatory cycle 7 ↔ 8
    ],
    achievements: [
      fakeAchievement(9000201, ['(Qf=9000001)', '(Qf=9000002)']),
      fakeAchievement(9000202, ['(OA=9000201)']),
      fakeAchievement(9000203, ['(Qf=9000001)', '(EM>9300001,0,d)']),
      fakeAchievement(9000204, ['(Qf=9000001)'], [9000999]),
      fakeAchievement(9000205, []),
    ],
  };
  const graph = buildGraph(dataset);

  it('a key that is both mandatory and alternative stays mandatory only', () => {
    const node = graph.nodes.get('q:9000003');
    expect(node?.mandatory).toEqual(['q:9000002']);
    expect(node?.alternative).toEqual(['q:9000001', 'q:9000004']);
    expect(node?.exclusions).toEqual(['q:9000005']);
  });

  it('ignores self references and reports missing nodes', () => {
    expect(graph.nodes.get('q:9000005')?.mandatory).toEqual(['q:9099999']);
    expect([...graph.missing]).toEqual([['q:9099999', ['q:9000005']]]);
  });

  it('an unparsable criterion gives an unknown requirement, not an exception', () => {
    expect(graph.nodes.get('q:9000006')?.requirement).toEqual({ t: 'unknown', raw: 'PL>>' });
  });

  it('marks deducible achievements only when every objective is a node leaf and none is missing', () => {
    expect(graph.nodes.get('a:9000201')?.deducible).toBe(true);
    expect(graph.nodes.get('a:9000202')?.deducible).toBe(true);
    expect(graph.nodes.get('a:9000203')?.deducible).toBe(false);
    expect(graph.nodes.get('a:9000204')?.deducible).toBe(false);
    expect(graph.nodes.get('a:9000205')?.deducible).toBe(false);
  });

  it('propagates through mandatory edges only, and deduces achievements to a fixpoint', () => {
    const done = computeEffectiveDone(graph, progress([9000003]));
    expect([...done.effective].sort()).toEqual([
      'a:9000201',
      'a:9000202',
      'q:9000001',
      'q:9000002',
      'q:9000003',
    ]);
    expect(done.implied.get('q:9000002')).toBe('q:9000003');
    expect(done.implied.get('q:9000001')).toBe('q:9000002');
    expect(done.effective.has('q:9000004')).toBe(false);
  });

  it('ticking an achievement implies its mandatory objectives', () => {
    const done = computeEffectiveDone(graph, progress([], [9000202]));
    expect([...done.effective].sort()).toEqual([
      'a:9000201',
      'a:9000202',
      'q:9000001',
      'q:9000002',
    ]);
  });

  it('survives mandatory cycles and unknown ticked ids', () => {
    const done = computeEffectiveDone(graph, progress([9000007, 9077777]));
    expect(done.effective.has('q:9000008')).toBe(true);
    expect(done.effective.has('q:9077777')).toBe(true);
  });
});
