import { describe, expect, it } from 'vitest';
import type { CompiledAchievement, CompiledDataset, CompiledQuest } from '../../src/core/dataset';
import { compileCriterion } from './compile';
import {
  catalogTable,
  closure,
  extractSubgraph,
  goalRoots,
  indexDataset,
  prerequisiteKeys,
} from './subgraph';

/** Synthetic dataset: ids ≥ 9 000 000 and FAKE names (CLAUDE.md, golden rule 4). */
const noReward = { items: [], titles: [], ornaments: [], emotes: [], spells: [] };

function quest(id: number, start: string, extra: Partial<CompiledQuest> = {}): CompiledQuest {
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
    start: compileCriterion(start),
    startPositions: [],
    steps: [],
    rewards: noReward,
    dbNeed: null,
    ...extra,
  };
}

function achievement(id: number, criteria: string[], rewardItem?: number): CompiledAchievement {
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
      criterion: compileCriterion(c),
    })),
    missingObjectiveIds: [],
    rewardBands: rewardItem
      ? [
          {
            levelMin: -1,
            levelMax: -1,
            reward: { ...noReward, items: [{ itemId: rewardItem, qty: 1 }] },
          },
        ]
      : [],
    dbNeed: null,
  };
}

const item = (id: number, extra: object = {}) => ({
  id,
  name: `FAKE objet ${id}`,
  typeId: 9810001,
  level: 1,
  iconId: null,
  isQuestItem: false,
  criterion: null,
  dropMonsterIds: [],
  recipe: null,
  questsThatReward: [],
  achievementsThatReward: [],
  ...extra,
});

const dataset: CompiledDataset = {
  quests: [
    quest(9000001, 'BT=1'),
    quest(9000002, 'PL>9&Qf=9000001&Qf!9000005'),
    quest(9000003, 'Qf=9000002&(Qf=9000004|Qf=9000006)&PO=9100002', {
      steps: [
        {
          id: 1,
          name: 'FAKE étape',
          optimalLevel: 1,
          rewardBands: [],
          objectives: [
            { id: 1, text: 'FAKE', t: 'bringItem', itemId: 9100003, qty: 2, npcId: 9200001 },
            {
              id: 2,
              text: 'FAKE',
              t: 'killMonster',
              monsterId: 9300001,
              qty: 1,
              singleFight: true,
              mapId: null,
              dungeonIds: [9000401],
            },
          ],
        },
      ],
    }),
    quest(9000004, 'Qf=9000003'), // cycle 3 ↔ 4
    quest(9000005, 'BT=1'), // only cited negatively: never part of a plan
    quest(9000006, 'QF>9000001,0&Qf=9099999'), // cites a missing quest
  ],
  achievements: [
    achievement(9000201, ['(Qf=9000003)', '(OA=9000202)'], 9100001),
    achievement(9000202, ['(EM>9300002,0,d)']),
  ],
  items: [
    item(9100001, { achievementsThatReward: [9000201] }),
    item(9100002),
    item(9100003, {
      recipe: { jobId: 9900001, ingredients: [[9100004, 3]] },
      dropMonsterIds: [9300003],
    }),
    item(9100004),
    item(9100005),
  ],
  monsters: [
    {
      id: 9300001,
      name: 'FAKE boss',
      isBoss: true,
      isMiniBoss: false,
      drops: [[9100005, [1, 1, 1, 1, 1]]],
    },
    { id: 9300002, name: 'FAKE monstre', isBoss: false, isMiniBoss: false, drops: [] },
    {
      id: 9300003,
      name: 'FAKE dropper',
      isBoss: false,
      isMiniBoss: false,
      drops: [[9100003, [5, 5, 5, 5, 5]]],
    },
    { id: 9300004, name: 'FAKE hors sujet', isBoss: false, isMiniBoss: false, drops: [] },
  ],
  dungeons: [
    {
      id: 9000401,
      name: 'FAKE donjon',
      level: 30,
      minLevel: 20,
      monsterIds: [9300001],
      bossIds: [9300001],
      requiredItems: [],
    },
  ],
  refs: {
    questCategories: [{ id: 9600001, name: 'FAKE', order: 1 }],
    achievementCategories: [{ id: 9600002, name: 'FAKE', parentId: 0, order: 1 }],
    jobs: [],
    breeds: [],
    alignmentSides: [],
    itemTypes: [{ id: 9810001, name: 'FAKE type', superTypeId: null }],
    itemSuperTypes: [],
    objectiveTypes: [],
    npcs: [
      { id: 9200001, name: 'FAKE PNJ' },
      { id: 9200002, name: 'FAKE PNJ inutile' },
    ],
    subareas: [],
  },
  goals: [
    {
      goal: { t: 'item', itemId: 9100001 },
      name: 'FAKE objet 9100001',
      level: 1,
      sources: { quests: [], achievements: [9000201] },
    },
  ],
};

describe('prerequisiteKeys', () => {
  it('keeps positive Qf / QF / OA atoms and ignores exclusions and other keys', () => {
    expect(prerequisiteKeys(compileCriterion('PL>9&Qf=1&Qf!2&(QF>3,0|OA=4)&Qa=5'))).toEqual([
      'q:1',
      'q:3',
      'a:4',
    ]);
    expect(prerequisiteKeys(compileCriterion('PL>>'))).toEqual([]);
    expect(prerequisiteKeys(null)).toEqual([]);
  });
});

describe('closure', () => {
  const index = indexDataset(dataset);

  it('follows every branch, survives cycles, and reports missing nodes', () => {
    const result = closure(index, goalRoots(dataset, { t: 'item', itemId: 9100001 }));
    expect([...result.nodes].sort()).toEqual([
      'a:9000201',
      'a:9000202',
      'q:9000001',
      'q:9000002',
      'q:9000003',
      'q:9000004',
      'q:9000006',
    ]);
    expect([...result.missing]).toEqual(['q:9099999']);
  });

  it('never includes a quest that is only excluded', () => {
    expect(closure(index, ['q:9000002']).nodes.has('q:9000005')).toBe(false);
  });

  it('returns nothing for an item without source', () => {
    expect(goalRoots(dataset, { t: 'item', itemId: 9100005 })).toEqual([]);
    expect(goalRoots(dataset, { t: 'item', itemId: 9199999 })).toEqual([]);
  });
});

describe('extractSubgraph', () => {
  const { dataset: sub, missing } = extractSubgraph(dataset, { t: 'item', itemId: 9100001 });

  it('keeps the nodes of the closure', () => {
    expect(sub.quests.map((q) => q.id)).toEqual([9000001, 9000002, 9000003, 9000004, 9000006]);
    expect(sub.achievements.map((a) => a.id)).toEqual([9000201, 9000202]);
    expect(missing).toEqual(['q:9099999']);
  });

  it('keeps referenced entities only: goal item, criteria items, objectives, one recipe level, dungeons, droppers', () => {
    expect(sub.items.map((i) => i.id)).toEqual([9100001, 9100002, 9100003, 9100004]);
    expect(sub.monsters.map((m) => m.id)).toEqual([9300001, 9300002, 9300003]);
    expect(sub.monsters[0]?.drops).toEqual([]); // drop of an item outside the sub-graph is filtered out
    expect(sub.dungeons.map((d) => d.id)).toEqual([9000401]);
    expect(sub.refs.npcs).toEqual([{ id: 9200001, name: 'FAKE PNJ' }]);
    expect(sub.goals).toHaveLength(1);
  });

  it('works for a quest goal', () => {
    const result = extractSubgraph(dataset, { t: 'quest', id: 9000002 });
    expect(result.dataset.quests.map((q) => q.id)).toEqual([9000001, 9000002]);
    expect(result.dataset.goals).toEqual([]);
  });
});

describe('catalogTable', () => {
  it('sizes each goal of the catalog', () => {
    expect(catalogTable(dataset)).toEqual([
      {
        itemId: 9100001,
        name: 'FAKE objet 9100001',
        level: 1,
        sources: 'succès 9000201',
        quests: 5,
        achievements: 2,
        nodes: 7,
        missing: 1,
      },
    ]);
  });
});
