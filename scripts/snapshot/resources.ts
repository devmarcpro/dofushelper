/**
 * What the snapshot downloads, and which fields (always $select, DATA_SOURCES.md §3.5).
 * Routes and fields come from docs/DATA_NOTES.md (M1-1), never from memory.
 */

export interface TableSpec {
  /** Name used in logs, in --only and in snapshot.json. */
  name: string;
  route: string;
  select: readonly string[];
}

/** Phase A — complete tables. Quests and achievements embed their steps, objectives and rewards. */
export const PHASE_A_TABLES: readonly TableSpec[] = [
  {
    name: 'quests',
    route: '/quests',
    select: [
      'id',
      'name',
      'categoryId',
      'type',
      'repeatType',
      'repeatLimit',
      'isDungeonQuest',
      'isPartyQuest',
      'isEvent',
      'followable',
      'levelMin',
      'levelMax',
      'startCriterion',
      'startPosition',
      'stepIds',
      'steps',
      'need',
    ],
  },
  {
    name: 'quest-categories',
    route: '/quest-categories',
    select: ['id', 'name', 'order', 'questIds'],
  },
  { name: 'quest-objective-types', route: '/quest-objective-types', select: ['id', 'name'] },
  {
    name: 'achievements',
    route: '/achievements',
    select: [
      'id',
      'name',
      'description',
      'categoryId',
      'points',
      'level',
      'order',
      'accountLinked',
      'objectiveIds',
      'objectives',
      'rewardIds',
      'rewards',
      'need',
    ],
  },
  {
    name: 'achievement-categories',
    route: '/achievement-categories',
    select: ['id', 'name', 'parentId', 'order', 'achievementIds', 'visibilityCriterion'],
  },
  { name: 'item-types', route: '/item-types', select: ['id', 'name', 'superTypeId', 'categoryId'] },
  { name: 'item-super-types', route: '/item-super-types', select: ['id', 'name'] },
  { name: 'jobs', route: '/jobs', select: ['id', 'name'] },
  { name: 'breeds', route: '/breeds', select: ['id', 'shortName'] },
  { name: 'alignment-sides', route: '/alignment-sides', select: ['id', 'name'] },
  {
    name: 'dungeons',
    route: '/dungeons',
    select: [
      'id',
      'name',
      'optimalPlayerLevel',
      'minLevel',
      'monsters',
      'bosses',
      'requiredObjects',
      'achievements',
      'subarea',
      'entranceMapId',
      'mapIds',
    ],
  },
];

export const ITEM_SELECT: readonly string[] = [
  'id',
  'name',
  'typeId',
  'level',
  'iconId',
  'criterions',
  'recipeIds',
  'dropMonsterIds',
  'dropSubAreaIds',
  'questsThatUse',
  'questsThatReward',
  'achievementsThatReward',
  'exchangeable',
  'isSaleable',
  'hasRecipe',
];

/** Ingredients of a recipe only need a label. */
export const INGREDIENT_SELECT: readonly string[] = ['id', 'name', 'typeId', 'level', 'iconId'];

export const MONSTER_SELECT: readonly string[] = [
  'id',
  'name',
  'isBoss',
  'isMiniBoss',
  'isQuestMonster',
  'race',
  'subareas',
  'favoriteSubareaId',
  'drops',
];

export const NPC_SELECT: readonly string[] = ['id', 'name'];
export const SUBAREA_SELECT: readonly string[] = ['id', 'name'];
export const RECIPE_SELECT: readonly string[] = [
  'id',
  'resultId',
  'ingredientIds',
  'quantities',
  'jobId',
  'resultLevel',
];
export const ACHIEVEMENT_OBJECTIVE_SELECT: readonly string[] = [
  'id',
  'achievementId',
  'order',
  'name',
  'criterion',
];

/** Phase B resource names, in download order (for --only and logs). */
export const PHASE_B_NAMES = [
  'dofus-items',
  'items',
  'recipes',
  'ingredient-items',
  'monsters',
  'npcs',
  'subareas',
  'achievement-objectives',
] as const;
