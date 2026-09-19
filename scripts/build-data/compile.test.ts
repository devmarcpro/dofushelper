import { describe, expect, it } from 'vitest';
import { EMPTY_OVERRIDES, compileDataset, type RawSnapshot } from './compile';
import { stableStringify } from './stable-json';
import { validateDataset } from './validate';

/** Synthetic raw snapshot: ids ≥ 9 000 000 and FAKE names only (CLAUDE.md, golden rule 4). */
const name = (fr: string) => ({ fr, en: `${fr} (en)` });

function fakeRaw(): RawSnapshot {
  return {
    gameVersion: 'FAKE-1.0',
    tables: {
      quests: [
        {
          id: 9000002,
          name: name('FAKE quête B'),
          categoryId: 9600001,
          levelMin: 10,
          levelMax: 20,
          isDungeonQuest: false,
          isPartyQuest: false,
          isEvent: false,
          repeatType: 0,
          repeatLimit: 1,
          startCriterion: 'PL>9&(Qf=9000001|Qf=9000003)',
          startPosition: [{ mapId: 9700001, npcId: 9200001 }],
          stepIds: [9000102, 9000101],
          need: { items: [9100001], quantities: [2], quests: [9000003, 9000001], achievements: [] },
          steps: [
            {
              id: 9000101,
              name: name('FAKE étape 2'),
              optimalLevel: 12,
              objectives: [
                {
                  id: 3,
                  typeId: 3,
                  text: name('Ramener à {npc,9200001} : x2 {item,9100001}'),
                  parameters: { parameter0: 9200001, parameter1: 9100001, parameter2: 2 },
                },
                {
                  id: 4,
                  typeId: 16,
                  text: name('FAKE combat'),
                  parameters: { parameter0: 9300001, parameter1: 1, parameter2: 9700002 },
                  need: { generated: { dungeons: [9000401] } },
                },
              ],
              rewards: [
                { levelMin: 20, levelMax: 20, itemsReward: [[9100002, 3]] },
                { levelMin: 21, levelMax: 21, itemsReward: [[9100002, 3]] },
                { levelMin: 22, levelMax: 22, itemsReward: [[9100002, 5]] },
              ],
            },
            {
              id: 9000102,
              name: name('FAKE étape 1'),
              optimalLevel: 10,
              objectives: [
                {
                  id: 1,
                  typeId: 1,
                  text: name('Aller voir {npc,9200001}'),
                  parameters: { parameter0: 9200001 },
                },
                {
                  id: 2,
                  typeId: 0,
                  text: name('FAKE texte libre'),
                  parameters: { parameter0: 9999999 },
                },
                {
                  id: 5,
                  typeId: 17,
                  text: name('FAKE fabrication'),
                  parameters: { parameter0: 9100003, parameter1: 1 },
                  need: { generated: { items: [9100001], quantities: [4] } },
                },
                null,
              ],
              rewards: [
                { levelMin: -1, levelMax: -1, itemsReward: [[9100002, 1]], titlesReward: [7] },
              ],
            },
          ],
        },
        {
          id: 9000001,
          name: name('FAKE quête A'),
          levelMin: 1,
          levelMax: 1,
          startCriterion: 'BT=1',
          steps: [],
        },
        { id: 9000003, name: name('FAKE quête cassée'), startCriterion: 'PL>>', steps: 'nope' },
        'garbage',
      ],
      achievements: [
        {
          id: 9000201,
          name: name('FAKE succès'),
          description: name('FAKE description'),
          categoryId: 9600002,
          points: 10,
          level: 50,
          order: 1,
          accountLinked: false,
          objectiveIds: [9000302, 9000301, 9000303],
          objectives: [
            { id: 9000302, order: 1, name: name('FAKE objectif 2'), criterion: '(EM>9300001,0,d)' },
            { id: 9000301, order: 0, name: name('FAKE objectif 1'), criterion: '(Qf=9000002)' },
            null,
          ],
          rewards: [
            {
              itemsReward: [9100004],
              itemsQuantityReward: [1],
              titlesReward: [],
              ornamentsReward: [3],
            },
            null,
          ],
          need: { items: [], quantities: [], quests: [9000002], achievements: [] },
        },
      ],
      'item-super-types': [
        { id: 9800001, name: name('Objet de quête') },
        { id: 9800002, name: name('FAKE super-type') },
      ],
      'item-types': [
        { id: 9810001, name: name('FAKE type quête'), superTypeId: 9800001 },
        { id: 9810002, name: name('Dofus'), superTypeId: 9800002 },
        { id: 9810003, name: name('FAKE type inutilisé'), superTypeId: 9800002 },
      ],
      items: [
        {
          id: 9100002,
          name: name('FAKE ressource'),
          typeId: 9810002,
          level: 5,
          iconId: 1,
          criterions: '',
          dropMonsterIds: [9300001],
          hasRecipe: false,
          questsThatReward: [9000002],
          achievementsThatReward: [],
        },
        {
          id: 9100001,
          name: name('FAKE objet de quête'),
          typeId: 9810001,
          level: 1,
          iconId: 2,
          criterions: 'cw<25',
          dropMonsterIds: [],
          hasRecipe: true,
        },
      ],
      'dofus-items': [
        {
          id: 9100004,
          name: name('FAKE Dofus'),
          typeId: 9810002,
          level: 100,
          achievementsThatReward: [9000201],
          questsThatReward: [],
        },
        {
          id: 9100005,
          name: name('FAKE Dofus sans source'),
          typeId: 9810002,
          level: 100,
          achievementsThatReward: [],
          questsThatReward: [],
        },
      ],
      'ingredient-items': [
        { id: 9100006, name: name('FAKE ingrédient'), typeId: 9810002, level: 1 },
      ],
      recipes: [
        {
          id: 9100001,
          resultId: 9100001,
          ingredientIds: [9100006],
          quantities: [3],
          jobId: 9900001,
        },
      ],
      monsters: [
        {
          id: 9300001,
          name: name('FAKE monstre'),
          isBoss: true,
          isMiniBoss: false,
          drops: [
            {
              objectId: 9100002,
              percentDropForGrade1: 10,
              percentDropForGrade2: 12,
              percentDropForGrade3: 14,
              percentDropForGrade4: 16,
              percentDropForGrade5: 18,
            },
            { objectId: 9199999, percentDropForGrade1: 1 },
          ],
        },
      ],
      dungeons: [
        {
          id: 9000401,
          name: name('FAKE donjon'),
          optimalPlayerLevel: 30,
          minLevel: 20,
          monsters: [9300001],
          bosses: [9300001],
          requiredObjects: [{ id: 9100002, quantity: 1 }],
        },
      ],
      'quest-categories': [{ id: 9600001, name: name('FAKE catégorie'), order: 2 }],
      'achievement-categories': [
        { id: 9600002, name: name('FAKE catégorie succès'), parentId: 0, order: 1 },
      ],
      jobs: [{ id: 9900001, name: name('FAKE métier') }],
      breeds: [{ id: 9900101, shortName: name('FAKE classe') }],
      'alignment-sides': [{ id: 0, name: name('FAKE neutre') }],
      'quest-objective-types': [{ id: 1, name: name('Aller voir #1') }],
      npcs: [{ id: 9200001, name: name('FAKE PNJ') }],
      subareas: [{ id: 9400001, name: name('FAKE zone') }],
    },
  };
}

describe('compileDataset', () => {
  const { dataset, errors, warnings } = compileDataset(fakeRaw(), EMPTY_OVERRIDES, 'fr');
  const questB = dataset.quests.find((q) => q.id === 9000002);

  it('sorts every list by id and skips garbage rows', () => {
    expect(dataset.quests.map((q) => q.id)).toEqual([9000001, 9000002, 9000003]);
    expect(dataset.items.map((i) => i.id)).toEqual([9100001, 9100002, 9100004, 9100005, 9100006]);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('sans id'))).toBe(true);
  });

  it('stores each criterion raw and as a Requirement, or as unknown with its parse error', () => {
    expect(questB?.start.raw).toBe('PL>9&(Qf=9000001|Qf=9000003)');
    expect(questB?.start.req.t).toBe('all');
    const broken = dataset.quests.find((q) => q.id === 9000003);
    expect(broken?.start.req).toEqual({ t: 'unknown', raw: 'PL>>' });
    expect(broken?.start.error?.pos).toBe(3);
    expect(broken?.steps).toEqual([]);
  });

  it('keeps the game order of steps (stepIds), not the id order', () => {
    expect(questB?.steps.map((s) => s.id)).toEqual([9000102, 9000101]);
  });

  it('maps objective types to typed objectives and falls back to other', () => {
    const [first, second] = questB?.steps ?? [];
    expect(first?.objectives.map((o) => o.t)).toEqual(['talkTo', 'other', 'craft']);
    expect(first?.objectives[2]).toMatchObject({
      t: 'craft',
      itemId: 9100003,
      qty: 1,
      ingredients: [[9100001, 4]],
    });
    expect(second?.objectives[0]).toEqual({
      id: 3,
      text: 'Ramener à {npc,9200001} : x2 {item,9100001}',
      t: 'bringItem',
      npcId: 9200001,
      itemId: 9100001,
      qty: 2,
    });
    expect(second?.objectives[1]).toMatchObject({
      t: 'killMonster',
      monsterId: 9300001,
      qty: 1,
      singleFight: true,
      mapId: 9700002,
      dungeonIds: [9000401],
    });
  });

  it('merges per-level reward rows into bands and aggregates quest rewards with the max per item', () => {
    const second = questB?.steps[1];
    expect(second?.rewardBands.map((b) => [b.levelMin, b.levelMax, b.reward.items])).toEqual([
      [20, 21, [{ itemId: 9100002, qty: 3 }]],
      [22, 22, [{ itemId: 9100002, qty: 5 }]],
    ]);
    // step 1 gives 1, step 2 gives at most 5 → 6
    expect(questB?.rewards).toEqual({
      items: [{ itemId: 9100002, qty: 6 }],
      titles: [7],
      ornaments: [],
      emotes: [],
      spells: [],
    });
  });

  it('compiles the DofusDB need aggregate as an oracle', () => {
    expect(questB?.dbNeed).toEqual({
      items: [[9100001, 2]],
      quests: [9000001, 9000003],
      achievements: [],
    });
  });

  it('compiles achievements: ordered objectives, missing ones listed, rewards merged', () => {
    const achievement = dataset.achievements[0];
    expect(achievement?.objectives.map((o) => o.id)).toEqual([9000301, 9000302]);
    expect(achievement?.objectives[1]?.criterion.req).toEqual({
      t: 'unknown',
      raw: 'EM>9300001,0,d',
    });
    expect(achievement?.objectives[0]?.criterion.req).toEqual({ t: 'questDone', id: 9000002 });
    expect(achievement?.missingObjectiveIds).toEqual([9000303]);
    expect(achievement?.rewards).toEqual({
      items: [{ itemId: 9100004, qty: 1 }],
      titles: [],
      ornaments: [3],
      emotes: [],
      spells: [],
    });
  });

  it('flags quest items from the super type, attaches recipes, filters drops to known items', () => {
    const questItem = dataset.items.find((i) => i.id === 9100001);
    expect(questItem).toMatchObject({
      isQuestItem: true,
      recipe: { jobId: 9900001, ingredients: [[9100006, 3]] },
    });
    expect(questItem?.criterion?.req).toEqual({ t: 'unknown', raw: 'cw<25' });
    expect(dataset.items.find((i) => i.id === 9100002)?.isQuestItem).toBe(false);
    expect(dataset.monsters[0]?.drops).toEqual([[9100002, [10, 12, 14, 16, 18]]]);
  });

  it('builds the goal catalog from Dofus items that have a source', () => {
    expect(dataset.goals).toEqual([
      {
        goal: { t: 'item', itemId: 9100004 },
        name: 'FAKE Dofus',
        level: 100,
        sources: { quests: [], achievements: [9000201] },
      },
    ]);
    expect(warnings.some((w) => w.includes('9100005'))).toBe(true);
  });

  it('keeps only the item types in use and reads breed names from shortName', () => {
    expect(dataset.refs.itemTypes.map((t) => t.id)).toEqual([9810001, 9810002]);
    expect(dataset.refs.breeds).toEqual([{ id: 9900101, name: 'FAKE classe' }]);
  });

  it('passes schema validation', () => {
    expect(validateDataset(dataset)).toEqual([]);
  });

  it('is deterministic: shuffled input gives byte-identical output', () => {
    const shuffled = fakeRaw();
    const tables = Object.fromEntries(
      Object.entries(shuffled.tables).map(([k, rows]) => [k, [...rows].reverse()]),
    );
    const again = compileDataset({ ...shuffled, tables }, EMPTY_OVERRIDES, 'fr').dataset;
    expect(stableStringify(again)).toBe(stableStringify(dataset));
  });
});

describe('overrides', () => {
  const meta = { reason: 'FAKE raison', source: 'FAKE source' };

  it('attaches an override to its node', () => {
    const { dataset, errors } = compileDataset(
      fakeRaw(),
      {
        quests: { '9000002': { ...meta, orderHint: 120, flags: { avoidable: true } } },
        achievements: {},
        items: { '9100002': { ...meta, isQuestItem: true } },
      },
      'fr',
    );
    expect(errors).toEqual([]);
    expect(dataset.quests.find((q) => q.id === 9000002)?.override).toMatchObject({
      orderHint: 120,
    });
    expect(dataset.items.find((i) => i.id === 9100002)?.isQuestItem).toBe(true);
  });

  it('applies removeRequires and addRequires to the compiled requirement, keeping the raw string', () => {
    const { dataset, errors, obsoleteOverrides } = compileDataset(
      fakeRaw(),
      {
        quests: {
          '9000002': {
            ...meta,
            removeRequires: ['Qf=9000003'],
            addRequires: [
              { t: 'questDone', id: 9000001 },
              { t: 'level', min: 30 },
            ],
          },
        },
        achievements: {
          '9000201': {
            ...meta,
            addRequires: [{ t: 'questDone', id: 9000001 }],
            flags: { note: 'FAKE note' },
          },
        },
        items: {},
      },
      'fr',
    );
    expect(errors).toEqual([]);
    const quest = dataset.quests.find((q) => q.id === 9000002);
    expect(quest?.start.raw).toBe('PL>9&(Qf=9000001|Qf=9000003)');
    expect(quest?.start.req).toEqual({
      t: 'all',
      of: [
        { t: 'level', min: 10 },
        { t: 'questDone', id: 9000001 },
        { t: 'level', min: 30 },
      ],
    });
    // Qf=9000001 was already required once the other branch was removed: reported as obsolete.
    expect(obsoleteOverrides).toEqual([
      'overrides/quests.json, quête 9000002 : {"t":"questDone","id":9000001} à ajouter est déjà exigé par le jeu',
    ]);
    const added = dataset.achievements[0]?.objectives.at(-1);
    expect(added).toEqual({
      id: -1,
      name: 'FAKE note',
      order: null,
      criterion: { raw: '', req: { t: 'questDone', id: 9000001 } },
    });
  });

  it('reports a removal that no longer matches, and fails on an invalid addition', () => {
    const { errors, obsoleteOverrides } = compileDataset(
      fakeRaw(),
      {
        quests: {
          '9000002': { ...meta, removeRequires: ['Qf=9077777'], addRequires: [{ t: 'nope' }] },
        },
        achievements: {},
        items: {},
      },
      'fr',
    );
    expect(obsoleteOverrides).toEqual([
      "overrides/quests.json, quête 9000002 : « Qf=9077777 » à retirer n'apparaît plus dans le critère du jeu",
    ]);
    expect(errors).toEqual([
      'overrides/quests.json, quête 9000002 : addRequires contient une entrée invalide {"t":"nope"}',
    ]);
  });

  it('fails when an override targets an id absent from the snapshot', () => {
    const { errors } = compileDataset(
      fakeRaw(),
      { quests: { '9099999': meta }, achievements: {}, items: {} },
      'fr',
    );
    expect(errors).toEqual([
      "overrides/quests.json : l'id 9099999 est absent du snapshot FAKE-1.0",
    ]);
  });

  it('fails when an override lacks reason or source', () => {
    const { errors } = compileDataset(
      fakeRaw(),
      { quests: { '9000002': { reason: '', source: 'x' } }, achievements: {}, items: {} },
      'fr',
    );
    expect(errors).toHaveLength(1);
  });
});

describe('validateDataset', () => {
  it('reports precise problems', () => {
    const { dataset } = compileDataset(fakeRaw(), EMPTY_OVERRIDES, 'fr');
    const first = dataset.quests[0];
    if (first) (first as unknown as { name: unknown }).name = 42;
    expect(validateDataset(dataset)).toEqual(['quests[9000001].name : valeur invalide (42)']);
  });
});

describe('stableStringify', () => {
  it('sorts keys recursively and keeps array order', () => {
    expect(stableStringify({ b: 1, a: { d: [3, 1], c: undefined } })).toBe(
      '{"a":{"d":[3,1]},"b":1}\n',
    );
  });
});
