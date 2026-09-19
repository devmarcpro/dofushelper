import { describe, expect, it } from 'vitest';
import { collectFromItems, collectIngredients, collectReferences } from './refs';

/** Synthetic cases only: ids ≥ 9 000 000 and FAKE names (CLAUDE.md, golden rule 4). */
const FAKE_QUEST = {
  id: 9000001,
  name: { fr: 'FAKE quête' },
  startCriterion: 'PL>9&(PO=9100001|DD>6,9100002)&Qf=9000002',
  startPosition: [{ mapId: 9700001, npcId: 9200001 }],
  steps: [
    {
      id: 9000101,
      objectives: [
        { id: 1, typeId: 1, parameters: { numParams: 1, parameter0: 9200002 } },
        {
          id: 2,
          typeId: 3,
          parameters: { parameter0: 9200003, parameter1: 9100003, parameter2: 4 },
        },
        { id: 3, typeId: 6, parameters: { parameter0: 9300001, parameter1: 2 } },
        {
          id: 4,
          typeId: 12,
          parameters: { parameter0: 9200004, parameter1: 9300002, parameter2: 1 },
        },
        { id: 5, typeId: 5, parameters: { parameter0: 9400001 } },
        { id: 6, typeId: 0, parameters: { parameter0: 9999999 } },
        {
          id: 7,
          typeId: 17,
          parameters: { parameter0: 9100004, parameter1: 1 },
          need: {
            generated: { items: [9100005, 9100006], quantities: [10, 10], itemToUse: [9100007] },
          },
        },
        null,
      ],
      rewards: [
        {
          id: 1,
          itemsReward: [
            [9100008, 1],
            [9100009, 2],
          ],
        },
        null,
      ],
    },
  ],
};

const FAKE_ACHIEVEMENT = {
  id: 9000201,
  name: { fr: 'FAKE succès' },
  need: { items: [9100010], quantities: [1], quests: [], achievements: [] },
  objectiveIds: [9000301, 9000302, 9000303],
  objectives: [
    { id: 9000301, criterion: '(EM>9300003,0,d)' },
    { id: 9000302, criterion: 'HD>9100011,0' },
    null,
  ],
  rewards: [{ id: 1, itemsReward: [9100012], itemsQuantityReward: [1] }],
};

const FAKE_DUNGEON = {
  id: 9000401,
  name: { fr: 'FAKE donjon' },
  monsters: [9300004, 9300005],
  bosses: [9300005],
  requiredObjects: [{ id: 9100013, quantity: 1 }],
  subarea: 9400002,
};

describe('collectReferences', () => {
  const refs = collectReferences({
    quests: [FAKE_QUEST],
    achievements: [FAKE_ACHIEVEMENT],
    dungeons: [FAKE_DUNGEON],
  });

  it('collects items from criteria, objectives, generated needs, rewards and dungeon keys', () => {
    expect([...refs.items].sort()).toEqual([
      9100001, 9100002, 9100003, 9100004, 9100005, 9100006, 9100007, 9100008, 9100009, 9100010,
      9100011, 9100012, 9100013,
    ]);
  });

  it('collects monsters from objectives, achievement criteria and dungeons', () => {
    expect([...refs.monsters].sort()).toEqual([9300001, 9300002, 9300003, 9300004, 9300005]);
  });

  it('collects NPCs from start positions and objectives', () => {
    expect([...refs.npcs].sort()).toEqual([9200001, 9200002, 9200003, 9200004]);
  });

  it('collects subareas', () => {
    expect([...refs.subareas].sort()).toEqual([9400001, 9400002]);
  });

  it('ignores the opaque parameter of free-text objectives (type 0)', () => {
    expect(refs.items.has(9999999)).toBe(false);
    expect(refs.npcs.has(9999999)).toBe(false);
  });

  it('reports achievement objectives that are listed but not embedded', () => {
    expect([...refs.missingAchievementObjectives]).toEqual([9000303]);
  });

  it('never throws on unexpected shapes', () => {
    const weird = collectReferences({
      quests: [
        null,
        42,
        'x',
        { steps: 'nope', startCriterion: '((' },
        { steps: [{ objectives: {} }] },
      ],
      achievements: [undefined, { objectives: [{ criterion: 12 }], rewards: 'x' }],
      dungeons: [[], { monsters: [{ id: 9300009 }, 'x'], subarea: { id: 9400009 } }],
    });
    expect([...weird.monsters]).toEqual([9300009]);
    expect([...weird.subareas]).toEqual([9400009]);
  });
});

describe('second wave', () => {
  it('collects drop monsters and items that have a recipe', () => {
    const result = collectFromItems([
      { id: 9100001, dropMonsterIds: [9300010, 9300011], recipeIds: [9500002], hasRecipe: false },
      { id: 9100002, dropMonsterIds: [], recipeIds: [], hasRecipe: true },
      null,
    ]);
    expect([...result.monsters]).toEqual([9300010, 9300011]);
    expect([...result.itemsWithRecipe]).toEqual([9100002]);
  });

  it('collects recipe ingredients', () => {
    expect([
      ...collectIngredients([{ resultId: 9100002, ingredientIds: [9100020, 9100021] }, 'x']),
    ]).toEqual([9100020, 9100021]);
  });
});
