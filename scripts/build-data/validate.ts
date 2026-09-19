/**
 * Schema validation of the compiled dataset, run at the end of data:build.
 * Hand-written on purpose: no runtime dependency. Returns precise messages, never throws.
 */
import type { CompiledDataset } from '../../src/core/dataset';

type Check = (value: unknown) => boolean;

const isInt: Check = (v) => typeof v === 'number' && Number.isInteger(v);
const isIntOrNull: Check = (v) => v === null || isInt(v);
const isStr: Check = (v) => typeof v === 'string';
const isBool: Check = (v) => typeof v === 'boolean';
const isBoolOrNull: Check = (v) => v === null || isBool(v);
const isArr: Check = (v) => Array.isArray(v);
const isObj: Check = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isObjOrNull: Check = (v) => v === null || isObj(v);

const OBJECTIVE_KINDS = new Set([
  'bringItem',
  'showItem',
  'useItem',
  'killMonster',
  'bringSoul',
  'craft',
  'talkTo',
  'goTo',
  'other',
]);

export function validateDataset(dataset: CompiledDataset): string[] {
  const problems: string[] = [];

  function checkFields(where: string, value: unknown, fields: Record<string, Check>): void {
    if (!isObj(value)) {
      problems.push(`${where} : objet attendu`);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const [field, check] of Object.entries(fields)) {
      if (!check(record[field])) {
        problems.push(
          `${where}.${field} : valeur invalide (${JSON.stringify(record[field]) ?? 'undefined'})`,
        );
      }
    }
  }

  function checkSortedUnique(where: string, list: readonly { id: number }[]): void {
    for (let i = 1; i < list.length; i += 1) {
      const previous = list[i - 1];
      const current = list[i];
      if (previous && current && previous.id >= current.id) {
        problems.push(`${where} : ids non triés ou dupliqués autour de ${current.id}`);
        return;
      }
    }
  }

  const criterion: Check = (v) =>
    isObj(v) && isStr((v as { raw?: unknown }).raw) && isObj((v as { req?: unknown }).req);
  const reward: Check = (v) =>
    isObj(v) &&
    ['items', 'titles', 'ornaments', 'emotes', 'spells'].every((k) =>
      isArr((v as Record<string, unknown>)[k]),
    );

  for (const quest of dataset.quests) {
    const where = `quests[${quest.id}]`;
    checkFields(where, quest, {
      id: isInt,
      name: isStr,
      categoryId: isIntOrNull,
      levelMin: isInt,
      levelMax: isInt,
      isDungeonQuest: isBool,
      isPartyQuest: isBoolOrNull,
      isEvent: isBoolOrNull,
      start: criterion,
      steps: isArr,
      rewards: reward,
    });
    for (const step of quest.steps) {
      checkFields(`${where}.steps[${step.id}]`, step, {
        id: isInt,
        name: isStr,
        objectives: isArr,
        rewardBands: isArr,
      });
      for (const objective of step.objectives) {
        checkFields(`${where}.steps[${step.id}].objectives[${objective.id}]`, objective, {
          id: isInt,
          text: isStr,
          t: (v) => typeof v === 'string' && OBJECTIVE_KINDS.has(v),
        });
      }
    }
  }
  checkSortedUnique('quests', dataset.quests);

  for (const achievement of dataset.achievements) {
    const where = `achievements[${achievement.id}]`;
    checkFields(where, achievement, {
      id: isInt,
      name: isStr,
      description: isStr,
      categoryId: isInt,
      points: isIntOrNull,
      level: isIntOrNull,
      objectives: isArr,
      missingObjectiveIds: isArr,
      rewards: reward,
    });
    for (const objective of achievement.objectives) {
      checkFields(`${where}.objectives[${objective.id}]`, objective, {
        id: isInt,
        name: isStr,
        criterion,
      });
    }
  }
  checkSortedUnique('achievements', dataset.achievements);

  for (const item of dataset.items) {
    checkFields(`items[${item.id}]`, item, {
      id: isInt,
      name: isStr,
      typeId: isInt,
      level: isIntOrNull,
      isQuestItem: isBool,
      dropMonsterIds: isArr,
      recipe: isObjOrNull,
      questsThatReward: isArr,
      achievementsThatReward: isArr,
    });
  }
  checkSortedUnique('items', dataset.items);

  for (const monster of dataset.monsters) {
    checkFields(`monsters[${monster.id}]`, monster, {
      id: isInt,
      name: isStr,
      isBoss: isBool,
      isMiniBoss: isBool,
      drops: isArr,
    });
  }
  checkSortedUnique('monsters', dataset.monsters);

  for (const dungeon of dataset.dungeons) {
    checkFields(`dungeons[${dungeon.id}]`, dungeon, {
      id: isInt,
      name: isStr,
      monsterIds: isArr,
      bossIds: isArr,
      requiredItems: isArr,
    });
  }
  checkSortedUnique('dungeons', dataset.dungeons);

  for (const goal of dataset.goals) {
    checkFields(`goals[${goal.goal.itemId}]`, goal, { name: isStr, goal: isObj, sources: isObj });
  }

  for (const [name, list] of Object.entries(dataset.refs)) {
    if (!Array.isArray(list)) {
      problems.push(`refs.${name} : tableau attendu`);
      continue;
    }
    for (const entry of list)
      checkFields(`refs.${name}[${entry.id}]`, entry, { id: isInt, name: isStr });
    checkSortedUnique(`refs.${name}`, list);
  }

  return problems;
}
