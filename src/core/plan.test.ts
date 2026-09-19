import { describe, expect, it } from 'vitest';
import dotruche from '../../tests/fixtures/item-15235-dotruche.json';
import iceDofus from '../../tests/fixtures/item-7043-dofus-des-glaces.json';
import quest1329 from '../../tests/fixtures/quest-1329-le-dofus-des-glaces.json';
import { parseCriterionSyntax } from './criteria';
import type { CompiledDataset, CompiledQuest } from './dataset';
import { buildGraph } from './graph';
import { evaluateProfileLeaf, resolvePlan } from './plan';
import type { Character, NodeKey } from './types';

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'FAKE-character',
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

const noReward = { items: [], titles: [], ornaments: [], emotes: [], spells: [] };
function fakeQuest(id: number, start: string, extra: Partial<CompiledQuest> = {}): CompiledQuest {
  const parsed = parseCriterionSyntax(start);
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
    start: parsed.ok
      ? { raw: start, ast: parsed.value }
      : { raw: start, ast: null, error: parsed.error },
    startPositions: [],
    steps: [],
    rewards: noReward,
    dbNeed: null,
    ...extra,
  };
}

const data1329 = quest1329.dataset as unknown as CompiledDataset;
const dataIce = iceDofus.dataset as unknown as CompiledDataset;
const dataDotruche = dotruche.dataset as unknown as CompiledDataset;
const sourcesOf =
  (dataset: CompiledDataset) =>
  (itemId: number): NodeKey[] => {
    const item = dataset.items.find((i) => i.id === itemId);
    return item
      ? [
          ...item.questsThatReward.map((id): NodeKey => `q:${id}`),
          ...item.achievementsThatReward.map((id): NodeKey => `a:${id}`),
        ]
      : [];
  };

describe('resolvePlan — real fixture, quest 1329', () => {
  const graph = buildGraph(data1329);
  const goal = { t: 'quest', id: 1329 } as const;
  const branchOf = (plan: ReturnType<typeof resolvePlan>) => {
    const choice = plan.choicePoints.find((c) => c.owner === 'q:1329');
    return { choice, branch: choice?.branches[choice.chosen] };
  };

  it('follows the alignment of the character: Bonta → 710, Brâkmar → 711, neutral → 1316', () => {
    const cases = [
      [1, 710],
      [2, 711],
      [0, 1316],
    ] as const;
    for (const [alignment, questId] of cases) {
      const plan = resolvePlan(graph, goal, character({ alignment }));
      const { choice, branch } = branchOf(plan);
      expect(choice?.chosenBy).toBe('profile');
      expect(branch).toEqual({ t: 'questDone', id: questId });
      const keys = plan.nodes.map((n) => n.key);
      expect(keys).toContain(`q:${questId}`);
      for (const other of [710, 711, 1316].filter((id) => id !== questId))
        expect(keys).not.toContain(`q:${other}`);
    }
  });

  it('falls back to a default branch when the alignment is not filled in, and says so', () => {
    const { choice } = branchOf(resolvePlan(graph, goal, character()));
    expect(choice?.chosenBy).toBe('default');
    expect(choice?.branches).toHaveLength(3);
  });

  it('prefers a branch already done, then the choice of the player', () => {
    const viaProgress = branchOf(
      resolvePlan(graph, goal, character({ alignment: 1, doneQuests: [711] })),
    );
    expect(viaProgress.choice?.chosenBy).toBe('progress');
    expect(viaProgress.branch).toEqual({ t: 'questDone', id: 711 });

    const id = viaProgress.choice?.id ?? '';
    const viaUser = branchOf(resolvePlan(graph, goal, character({ choices: { [id]: 2 } })));
    expect(viaUser.choice?.chosenBy).toBe('user');
    expect(viaUser.branch).toEqual({ t: 'questDone', id: 1316 });
  });

  it('gives choice points a deterministic id made of the owner and the position', () => {
    const plan = resolvePlan(graph, goal, character());
    expect(branchOf(plan).choice?.id).toMatch(/^q:1329#0(\.\d+)*$/);
    expect(resolvePlan(graph, goal, character()).choicePoints).toEqual(plan.choicePoints);
  });

  it('orders prerequisites before dependants and ends with the goal', () => {
    const plan = resolvePlan(graph, goal, character({ alignment: 1 }));
    const position = new Map(plan.nodes.map((n, index) => [n.key, index]));
    for (const node of plan.nodes) {
      for (const dependency of node.dependsOn) {
        expect(position.get(dependency)).toBeLessThan(position.get(node.key) ?? -1);
      }
    }
    expect(plan.nodes.at(-1)?.key).toBe('q:1329');
    expect(plan.issues.filter((i) => i.t === 'cycle' || i.t === 'missingNode')).toEqual([]);
  });

  it('keeps the same order when a node gets ticked', () => {
    const before = resolvePlan(graph, goal, character({ alignment: 1 }));
    const first = before.nextActions[0];
    const ticked = Number(first?.slice(2));
    const after = resolvePlan(graph, goal, character({ alignment: 1, doneQuests: [ticked] }));
    expect(after.nodes.map((n) => n.key)).toEqual(before.nodes.map((n) => n.key));
    expect(after.progress.done).toBe(before.progress.done + 1);
  });

  it('statuses: ticking 1329 marks it done and everything else implied', () => {
    const plan = resolvePlan(graph, goal, character({ alignment: 1, doneQuests: [1329] }));
    expect(plan.nodes.at(-1)?.status).toBe('done');
    const branchNode = plan.nodes.find((n) => n.key === 'q:710');
    expect(branchNode?.status).not.toBe('implied'); // a choice branch is never deduced
    expect(plan.nodes.filter((n) => n.status === 'implied').length).toBeGreaterThanOrEqual(28);
    expect(plan.nodes.find((n) => n.key === 'q:1317')?.impliedBy).toBe('q:1329');
  });

  it('blocks on the level only when the level is filled in', () => {
    const unknownLevel = resolvePlan(graph, goal, character({ alignment: 1 }));
    expect(unknownLevel.nodes.flatMap((n) => n.blockedBy).some((r) => r.t === 'level')).toBe(false);
    const lowLevel = resolvePlan(graph, goal, character({ alignment: 1, level: 1 }));
    expect(lowLevel.nodes.flatMap((n) => n.blockedBy).some((r) => r.t === 'level')).toBe(true);
  });
});

describe('resolvePlan — real fixtures, item goals', () => {
  it('Dotruche: a 5-node ordered plan rooted at the quest that rewards the item', () => {
    const plan = resolvePlan(buildGraph(dataDotruche), { t: 'item', itemId: 15235 }, character(), {
      itemSources: sourcesOf(dataDotruche),
    });
    expect(plan.nodes).toHaveLength(5);
    expect(plan.nodes.at(-1)?.key).toBe('q:1517');
    expect(plan.nextActions.length).toBeGreaterThan(0);
    expect(plan.progress).toEqual({ done: 0, total: 5 });
  });

  it('Dofus des Glaces: rooted at achievement 922, reaching quest 1329', () => {
    const plan = resolvePlan(
      buildGraph(dataIce),
      { t: 'item', itemId: 7043 },
      character({ alignment: 2 }),
      {
        itemSources: sourcesOf(dataIce),
      },
    );
    const keys = plan.nodes.map((n) => n.key);
    expect(plan.nodes.at(-1)?.key).toBe('a:922');
    expect(keys).toContain('q:1329');
    expect(keys).toContain('q:711');
  });

  it('an item without source gives an empty plan and a DataIssue', () => {
    const plan = resolvePlan(
      buildGraph(dataDotruche),
      { t: 'item', itemId: 9100999 },
      character(),
      {
        itemSources: sourcesOf(dataDotruche),
      },
    );
    expect(plan.nodes).toEqual([]);
    expect(plan.issues).toEqual([{ t: 'noSourceForItem', itemId: 9100999 }]);
  });
});

describe('resolvePlan — synthetic cases', () => {
  const graph = buildGraph({
    quests: [
      fakeQuest(9000001, 'BT=1'),
      fakeQuest(9000002, 'PL>49&PJ>9900001,19&PG=9900101&Qf=9000001&Zz=1&Sc=9'),
      fakeQuest(9000003, 'Qf=9000002&Qf=9000004'),
      fakeQuest(9000004, 'Qf=9000003'), // mandatory cycle 3 ↔ 4
      fakeQuest(9000005, 'Qf=9099999&Qf=9000001'), // missing prerequisite
      fakeQuest(9000006, 'Qf=9000001&((Ps=1&Pm=5)|(Ps=2&Pm=6))'), // any without nodes
      fakeQuest(9000007, 'BT=1', { levelMin: 50 }),
      fakeQuest(9000008, 'BT=1', { levelMin: 10 }),
      fakeQuest(9000009, 'Qf=9000007&Qf=9000008'),
    ],
    achievements: [],
  });

  it('reports a cycle, ignores the edge and still returns a plan', () => {
    const plan = resolvePlan(graph, { t: 'quest', id: 9000003 }, character());
    expect(plan.issues.some((i) => i.t === 'cycle')).toBe(true);
    expect(plan.nodes.map((n) => n.key)).toContain('q:9000003');
    expect(plan.nodes).toHaveLength(4);
  });

  it('reports a missing node and keeps the carrier in the plan', () => {
    const plan = resolvePlan(graph, { t: 'quest', id: 9000005 }, character());
    expect(plan.issues).toContainEqual({
      t: 'missingNode',
      key: 'q:9099999',
      referencedBy: 'q:9000005',
    });
    expect(plan.nodes.map((n) => n.key)).toEqual(['q:9000001', 'q:9000005']);
  });

  it('lists block reasons in clear, only for filled-in profile data', () => {
    const blocked = resolvePlan(
      graph,
      { t: 'quest', id: 9000002 },
      character({ level: 10, jobs: { 9900001: 5 }, breedId: 9900102 }),
    ).nodes.at(-1);
    expect(blocked?.status).toBe('blocked');
    expect(blocked?.blockedBy).toEqual([
      { t: 'node', key: 'q:9000001' },
      { t: 'level', min: 50 },
      { t: 'jobLevel', jobId: 9900001, min: 20 },
      { t: 'breed', id: 9900101, negated: false },
    ]);
    const open = resolvePlan(
      graph,
      { t: 'quest', id: 9000002 },
      character({ doneQuests: [9000001] }),
    ).nodes.at(-1);
    expect(open?.status).toBe('available');
    expect(open?.context).toEqual(['Zz=1', 'Sc=9']);
  });

  it('records unknown criteria as issues without blocking', () => {
    const plan = resolvePlan(graph, { t: 'quest', id: 9000002 }, character());
    expect(plan.issues).toContainEqual({ t: 'unknownCriterion', raw: 'Zz=1', owner: 'q:9000002' });
  });

  it('an `any` without nodes blocks only when every branch contradicts the profile', () => {
    const goal = { t: 'quest', id: 9000006 } as const;
    const open = resolvePlan(
      graph,
      goal,
      character({ doneQuests: [9000001], alignment: 2 }),
    ).nodes.at(-1);
    expect(open?.status).toBe('available');
    const blocked = resolvePlan(
      graph,
      goal,
      character({ doneQuests: [9000001], alignment: 0 }),
    ).nodes.at(-1);
    expect(blocked?.status).toBe('blocked');
    expect(blocked?.context).toEqual(['Pm=5', 'Pm=6']);
    expect(plan9000006ChoicePoints()).toEqual([]);
  });

  function plan9000006ChoicePoints() {
    return resolvePlan(graph, { t: 'quest', id: 9000006 }, character()).choicePoints;
  }

  it('breaks ties by level, then id', () => {
    const plan = resolvePlan(graph, { t: 'quest', id: 9000009 }, character());
    expect(plan.nodes.map((n) => n.key)).toEqual(['q:9000008', 'q:9000007', 'q:9000009']);
  });

  it('an unknown goal is a missing node, not an exception', () => {
    const plan = resolvePlan(graph, { t: 'achievement', id: 9099998 }, character());
    expect(plan.nodes).toEqual([]);
    expect(plan.issues).toEqual([{ t: 'missingNode', key: 'a:9099998', referencedBy: 'goal' }]);
  });
});

describe('evaluateProfileLeaf', () => {
  it('is unknown when the profile is not filled in, and inverts under not', () => {
    const empty = character();
    expect(evaluateProfileLeaf({ t: 'level', min: 10 }, empty)).toBe('unknown');
    expect(evaluateProfileLeaf({ t: 'not', of: { t: 'alignment', side: 1 } }, empty)).toBe(
      'unknown',
    );
    const bonta = character({ alignment: 1, level: 20 });
    expect(evaluateProfileLeaf({ t: 'level', min: 10 }, bonta)).toBe('ok');
    expect(evaluateProfileLeaf({ t: 'not', of: { t: 'alignment', side: 1 } }, bonta)).toBe('fail');
    expect(evaluateProfileLeaf({ t: 'not', of: { t: 'alignment', side: 2 } }, bonta)).toBe('ok');
    expect(evaluateProfileLeaf({ t: 'hasItem', itemId: 9100001, qty: 1 }, bonta)).toBe('ok');
  });
});
