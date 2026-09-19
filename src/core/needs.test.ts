import { describe, expect, it } from 'vitest';
import dotruche from '../../tests/fixtures/item-15235-dotruche.json';
import iceDofus from '../../tests/fixtures/item-7043-dofus-des-glaces.json';
import quest1329 from '../../tests/fixtures/quest-1329-le-dofus-des-glaces.json';
import { compileCriterion } from './criterion';
import type { CompiledDataset, CompiledQuest, CompiledStep, RewardBand } from './dataset';
import { buildGraph } from './graph';
import { computeNeeds, rewardItemsForLevel, type NeedsIndex } from './needs';
import { resolvePlan } from './plan';
import type { Character, Goal, NodeKey, Objective } from './types';

/** Synthetic cases only: ids ≥ 9 000 000 and FAKE names (CLAUDE.md, golden rule 4). */
const ITEM = 9100001;
const OTHER = 9100002;
const noReward = { items: [], titles: [], ornaments: [], emotes: [], spells: [] };

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'FAKE',
    name: 'FAKE',
    breedId: null,
    level: null,
    alignment: null,
    jobs: {},
    serverName: null,
    doneQuests: [],
    doneAchievements: [],
    inventory: {},
    goals: [],
    choices: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const band = (items: [number, number][], levelMin = -1, levelMax = -1): RewardBand => ({
  levelMin,
  levelMax,
  reward: { ...noReward, items: items.map(([itemId, qty]) => ({ itemId, qty })) },
});

function step(id: number, objectives: Objective[], rewardBands: RewardBand[] = []): CompiledStep {
  return { id, name: `FAKE étape ${id}`, optimalLevel: null, objectives, rewardBands };
}

function quest(id: number, start: string, steps: CompiledStep[]): CompiledQuest {
  return {
    id,
    name: `FAKE quête ${id}`,
    categoryId: null,
    levelMin: 1,
    levelMax: 1,
    isDungeonQuest: false,
    isPartyQuest: false,
    isEvent: false,
    repeatType: 0,
    repeatLimit: 1,
    start: compileCriterion(start),
    startPositions: [],
    steps,
    rewards: noReward,
    dbNeed: null,
  };
}

const bring = (itemId: number, qty: number): Objective => ({
  id: 1,
  text: 'FAKE',
  t: 'bringItem',
  itemId,
  qty,
  npcId: null,
});
const show = (itemId: number, qty: number): Objective => ({
  id: 2,
  text: 'FAKE',
  t: 'showItem',
  itemId,
  qty,
  npcId: null,
});
const kill = (
  monsterId: number,
  qty: number,
  singleFight: boolean,
  dungeonIds: number[] = [],
): Objective => ({
  id: 3,
  text: 'FAKE',
  t: 'killMonster',
  monsterId,
  qty,
  singleFight,
  mapId: null,
  dungeonIds,
});

/** A chain A → B → C: each quest requires the previous one, so the plan order is A, B, C. */
function run(
  quests: CompiledQuest[],
  goalId: number,
  who: Character = character(),
  questItemIds: number[] = [],
) {
  const dataset = { quests, achievements: [] };
  const goal: Goal = { t: 'quest', id: goalId };
  const plan = resolvePlan(buildGraph(dataset), goal, who);
  const index: NeedsIndex = {
    quests: new Map(quests.map((q) => [q.id, q])),
    achievements: new Map(),
    questItemIds: new Set(questItemIds),
  };
  return computeNeeds(plan, index, who);
}

const A = 9000001;
const B = 9000002;
const C = 9000003;
const keyOf = (id: number): NodeKey => `q:${id}`;

describe('inventory simulation (SPEC §6.6)', () => {
  it('shown then given: the shown item is not counted twice', () => {
    const { needs } = run(
      [
        quest(A, 'BT=1', [step(1, [show(ITEM, 3)])]),
        quest(B, `Qf=${A}`, [step(2, [bring(ITEM, 3)])]),
      ],
      B,
    );
    expect(needs.items).toEqual([
      {
        itemId: ITEM,
        toAcquire: 3,
        owned: 0,
        remaining: 3,
        usedBy: [
          { key: keyOf(A), qty: 3, consumed: false },
          { key: keyOf(B), qty: 3, consumed: true },
        ],
        providedBy: [],
        isQuestItem: false,
      },
    ]);
  });

  it('given then shown: the item is gone, it must be acquired again', () => {
    const { needs } = run(
      [
        quest(A, 'BT=1', [step(1, [bring(ITEM, 3)])]),
        quest(B, `Qf=${A}`, [step(2, [show(ITEM, 2)])]),
      ],
      B,
    );
    expect(needs.items[0]?.toAcquire).toBe(5);
  });

  it('an intermediate reward of the plan covers a later need', () => {
    const { needs } = run(
      [
        quest(A, 'BT=1', [step(1, [], [band([[ITEM, 4]])])]),
        quest(B, `Qf=${A}`, [step(2, [bring(ITEM, 6)])]),
      ],
      B,
    );
    expect(needs.items[0]).toMatchObject({ toAcquire: 2, providedBy: [{ key: keyOf(A), qty: 4 }] });
  });

  it('a reward that comes after the need does not help', () => {
    const { needs } = run(
      [
        quest(A, 'BT=1', [step(1, [bring(ITEM, 6)])]),
        quest(B, `Qf=${A}`, [step(2, [], [band([[ITEM, 4]])])]),
      ],
      B,
    );
    expect(needs.items[0]?.toAcquire).toBe(6);
  });

  it('takes the owned quantity into account', () => {
    const who = character({ inventory: { [ITEM]: 4 } });
    const { needs } = run([quest(A, 'BT=1', [step(1, [bring(ITEM, 6)])])], A, who);
    expect(needs.items[0]).toMatchObject({ owned: 4, toAcquire: 2, remaining: 2 });
  });

  it('skips the nodes that are already done or implied', () => {
    const who = character({ doneQuests: [B] });
    const { needs } = run(
      [
        quest(A, 'BT=1', [step(1, [bring(ITEM, 6)])]),
        quest(B, `Qf=${A}`, [step(2, [bring(ITEM, 1)])]),
        quest(C, `Qf=${B}`, [step(3, [bring(OTHER, 2)])]),
      ],
      C,
      who,
    );
    expect(needs.items.map((i) => i.itemId)).toEqual([OTHER]);
  });

  it('a hasItem criterion is a need (shown), and an item only rewarded is not a need', () => {
    const { needs } = run([quest(A, `PO>${ITEM},9`, [step(1, [], [band([[OTHER, 1]])])])], A);
    expect(needs.items).toHaveLength(1);
    expect(needs.items[0]).toMatchObject({
      itemId: ITEM,
      toAcquire: 10,
      usedBy: [{ key: keyOf(A), qty: 10, consumed: false }],
    });
  });

  it('counts craft ingredients as consumed and flags quest items', () => {
    const craft: Objective = {
      id: 9,
      text: 'FAKE',
      t: 'craft',
      itemId: OTHER,
      qty: 1,
      ingredients: [[ITEM, 10]],
    };
    const { needs } = run([quest(A, 'BT=1', [step(1, [craft])])], A, character(), [ITEM]);
    expect(needs.items[0]).toMatchObject({ itemId: ITEM, toAcquire: 10, isQuestItem: true });
  });
});

describe('crafted items (SPEC §6.6)', () => {
  /**
   * Regression: a craft consumed its ingredients but produced nothing, so an item crafted inside
   * the plan was ALSO listed as "to gather" — the ingredients and the result both. Real case:
   * quest 320, which crafts item 10046 then hands it in; 45 occurrences in the real dataset.
   */
  it('credits the crafted item, so it is not asked for twice', () => {
    const craft: Objective = {
      id: 9,
      text: 'FAKE',
      t: 'craft',
      itemId: OTHER,
      qty: 1,
      ingredients: [[ITEM, 3]],
    };
    const { needs } = run([quest(A, 'BT=1', [step(1, [craft, bring(OTHER, 1)])])], A);
    // Only the ingredients have to be gathered; the crafted item shows as provided by the plan.
    expect(needs.items.map((i) => [i.itemId, i.toAcquire])).toEqual([
      [ITEM, 3],
      [OTHER, 0],
    ]);
    expect(needs.items.find((i) => i.itemId === OTHER)?.providedBy).toEqual([
      { key: keyOf(A), qty: 1 },
    ]);
  });

  it('still asks for the crafted item when the plan needs more than it makes', () => {
    const craft: Objective = {
      id: 9,
      text: 'FAKE',
      t: 'craft',
      itemId: OTHER,
      qty: 1,
      ingredients: [[ITEM, 3]],
    };
    const { needs } = run([quest(A, 'BT=1', [step(1, [craft, bring(OTHER, 4)])])], A);
    expect(needs.items.find((i) => i.itemId === OTHER)?.toAcquire).toBe(3);
  });
});

describe('level-dependent rewards', () => {
  const bands = [band([[ITEM, 3]], 20, 80), band([[ITEM, 5]], 81, 200)];

  it('picks the band of the character level', () => {
    expect(rewardItemsForLevel(bands, 50)).toEqual([{ itemId: ITEM, qty: 3 }]);
    expect(rewardItemsForLevel(bands, 120)).toEqual([{ itemId: ITEM, qty: 5 }]);
    expect(rewardItemsForLevel(bands, 5)).toEqual([]);
    expect(rewardItemsForLevel([band([[ITEM, 2]])], 5)).toEqual([{ itemId: ITEM, qty: 2 }]);
  });

  it('keeps only the guaranteed minimum when the level is not filled in', () => {
    expect(rewardItemsForLevel(bands, null)).toEqual([{ itemId: ITEM, qty: 3 }]);
    expect(
      rewardItemsForLevel([band([[ITEM, 3]], 20, 80), band([[OTHER, 1]], 81, 200)], null),
    ).toEqual([]);
  });

  it('feeds the simulation', () => {
    const quests = [
      quest(A, 'BT=1', [step(1, [], bands)]),
      quest(B, `Qf=${A}`, [step(2, [bring(ITEM, 5)])]),
    ];
    expect(run(quests, B, character({ level: 120 })).needs.items[0]?.toAcquire).toBe(0);
    expect(run(quests, B, character({ level: 50 })).needs.items[0]?.toAcquire).toBe(2);
    expect(run(quests, B).needs.items[0]?.toAcquire).toBe(2);
  });
});

describe('monsters, dungeons, conditions', () => {
  it('sums monsters, tracks the largest single fight, links dungeons', () => {
    const { needs } = run(
      [
        quest(A, 'BT=1', [step(1, [kill(9300001, 5, false), kill(9300001, 2, true, [9000401])])]),
        quest(B, `Qf=${A}`, [
          step(2, [kill(9300001, 3, true, [9000401]), kill(9300002, 1, false)]),
        ]),
      ],
      B,
    );
    expect(needs.monsters).toEqual([
      { monsterId: 9300001, qty: 10, singleFightMax: 3, usedBy: [keyOf(A), keyOf(B)] },
      { monsterId: 9300002, qty: 1, singleFightMax: 0, usedBy: [keyOf(B)] },
    ]);
    expect(needs.dungeons).toEqual([{ dungeonId: 9000401, usedBy: [keyOf(A), keyOf(B)] }]);
  });

  it('aggregates conditions over the nodes left to do', () => {
    const { conditions } = run(
      [
        quest(A, 'PL>49&PJ>9900001,19&Sc=9', []),
        quest(B, `Qf=${A}&PL>99&PJ>9900001,9&PG=9900101&Ps!1&Ps!2&Zz=1`, []),
      ],
      B,
    );
    expect(conditions).toEqual({
      level: 100,
      jobs: [{ jobId: 9900001, min: 20 }],
      alignment: 0,
      breed: 9900101,
      context: ['Sc=9', 'Zz=1'],
    });
  });

  it('has no condition once everything is done', () => {
    const { conditions, needs } = run(
      [quest(A, 'PL>49', [step(1, [bring(ITEM, 1)])])],
      A,
      character({ doneQuests: [A] }),
    );
    expect(conditions).toEqual({
      level: null,
      jobs: [],
      alignment: null,
      breed: null,
      context: [],
    });
    expect(needs.items).toEqual([]);
  });
});

describe('real fixtures', () => {
  const cases = [
    ['Dotruche', dotruche.dataset, { t: 'item', itemId: 15235 }],
    ['quête 1329', quest1329.dataset, { t: 'quest', id: 1329 }],
    ['Dofus des Glaces', iceDofus.dataset, { t: 'item', itemId: 7043 }],
  ] as const;

  it.each(cases)('%s: needs and conditions are computed without error', (_name, raw, goal) => {
    const dataset = raw as unknown as CompiledDataset;
    const who = character({ alignment: 1, level: 200 });
    const plan = resolvePlan(buildGraph(dataset), goal, who, {
      itemSources: (itemId) => {
        const item = dataset.items.find((i) => i.id === itemId);
        return item
          ? [
              ...item.questsThatReward.map((id): NodeKey => `q:${id}`),
              ...item.achievementsThatReward.map((id): NodeKey => `a:${id}`),
            ]
          : [];
      },
    });
    const index: NeedsIndex = {
      quests: new Map(dataset.quests.map((q) => [q.id, q])),
      achievements: new Map(dataset.achievements.map((a) => [a.id, a])),
      questItemIds: new Set(dataset.items.filter((i) => i.isQuestItem).map((i) => i.id)),
    };
    const { needs, conditions } = computeNeeds(plan, index, who);
    expect(plan.nodes.length).toBeGreaterThan(0);
    expect(needs.items.every((i) => i.toAcquire >= 0 && i.usedBy.length > 0)).toBe(true);
    expect(needs.monsters.every((m) => m.qty > 0)).toBe(true);
    expect(conditions.level === null || conditions.level > 0).toBe(true);
  });

  it('quête 1329 asks for level 200, dungeons and monsters', () => {
    const dataset = quest1329.dataset as unknown as CompiledDataset;
    const who = character({ alignment: 1 });
    const plan = resolvePlan(buildGraph(dataset), { t: 'quest', id: 1329 }, who);
    const index: NeedsIndex = {
      quests: new Map(dataset.quests.map((q) => [q.id, q])),
      achievements: new Map(),
      questItemIds: new Set(dataset.items.filter((i) => i.isQuestItem).map((i) => i.id)),
    };
    const { needs, conditions } = computeNeeds(plan, index, who);
    expect(conditions.alignment).toBe(1);
    expect(conditions.level).toBeGreaterThan(0);
    expect(needs.dungeons.length).toBeGreaterThan(0);
    expect(needs.monsters.length).toBeGreaterThan(0);
  });
});
