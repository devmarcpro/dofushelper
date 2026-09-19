/**
 * Pure extraction of the ids referenced by phase A (quests, achievements, dungeons), so that
 * phase B only downloads the items, monsters and NPCs that are actually needed
 * (DATA_SOURCES.md §3.5). Unknown shapes are skipped, never thrown on (golden rule 7).
 */
import { parseCriterionSyntax, type CriterionAst } from '../../src/core/criteria';
import { OBJECTIVE_PARAM_ROLES } from '../build-data/objective-types';

export interface ReferencedIds {
  items: Set<number>;
  monsters: Set<number>;
  npcs: Set<number>;
  subareas: Set<number>;
  /** Objective ids listed by an achievement whose embedded objective is missing (null). */
  missingAchievementObjectives: Set<number>;
}

type Obj = Record<string, unknown>;

function asObj(value: unknown): Obj | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Obj)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function addId(target: Set<number>, value: unknown): void {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) target.add(value);
}

/** Criterion keys whose argument is an id we want to resolve. Position = index in `args`. */
const CRITERION_REFS: Readonly<Record<string, { kind: 'items' | 'monsters'; arg: number }>> = {
  PO: { kind: 'items', arg: 0 },
  DD: { kind: 'items', arg: 1 },
  DH: { kind: 'items', arg: 1 },
  DM: { kind: 'items', arg: 1 },
  HD: { kind: 'items', arg: 0 },
  EM: { kind: 'monsters', arg: 0 },
};

function collectFromAst(ast: CriterionAst, refs: ReferencedIds): void {
  if (ast.k !== 'atom') {
    for (const item of ast.items) collectFromAst(item, refs);
    return;
  }
  const rule = CRITERION_REFS[ast.key];
  if (rule) addId(refs[rule.kind], ast.args[rule.arg]);
}

function collectFromCriterion(raw: unknown, refs: ReferencedIds): void {
  if (typeof raw !== 'string' || raw.length === 0) return;
  const parsed = parseCriterionSyntax(raw);
  if (parsed.ok) collectFromAst(parsed.value, refs);
}

function collectFromObjective(objective: unknown, refs: ReferencedIds): void {
  const o = asObj(objective);
  if (!o) return;
  const roles = typeof o.typeId === 'number' ? OBJECTIVE_PARAM_ROLES[o.typeId] : undefined;
  const parameters = asObj(o.parameters);
  if (roles && parameters) {
    roles.forEach((role, index) => {
      const value = parameters[`parameter${index}`];
      if (role === 'npc') addId(refs.npcs, value);
      else if (role === 'item') addId(refs.items, value);
      else if (role === 'monster') addId(refs.monsters, value);
      else if (role === 'subarea') addId(refs.subareas, value);
    });
  }
  const generated = asObj(asObj(o.need)?.generated);
  for (const id of asArray(generated?.items)) addId(refs.items, id);
  for (const id of asArray(generated?.itemToUse)) addId(refs.items, id);
}

function collectFromQuest(quest: unknown, refs: ReferencedIds): void {
  const q = asObj(quest);
  if (!q) return;
  collectFromCriterion(q.startCriterion, refs);
  for (const position of asArray(q.startPosition)) addId(refs.npcs, asObj(position)?.npcId);
  for (const step of asArray(q.steps)) {
    const s = asObj(step);
    if (!s) continue;
    for (const objective of asArray(s.objectives)) collectFromObjective(objective, refs);
    for (const reward of asArray(s.rewards)) {
      for (const pair of asArray(asObj(reward)?.itemsReward)) addId(refs.items, asArray(pair)[0]);
    }
  }
}

function collectFromAchievement(achievement: unknown, refs: ReferencedIds): void {
  const a = asObj(achievement);
  if (!a) return;
  for (const id of asArray(asObj(a.need)?.items)) addId(refs.items, id);

  const objectiveIds = asArray(a.objectiveIds);
  const embedded = asArray(a.objectives);
  const embeddedIds = new Set<number>();
  for (const objective of embedded) {
    const o = asObj(objective);
    if (!o) continue;
    if (typeof o.id === 'number') embeddedIds.add(o.id);
    collectFromCriterion(o.criterion, refs);
  }
  for (const id of objectiveIds) {
    if (typeof id === 'number' && !embeddedIds.has(id))
      addId(refs.missingAchievementObjectives, id);
  }
  for (const reward of asArray(a.rewards)) {
    for (const id of asArray(asObj(reward)?.itemsReward)) addId(refs.items, id);
  }
}

function collectFromDungeon(dungeon: unknown, refs: ReferencedIds): void {
  const d = asObj(dungeon);
  if (!d) return;
  for (const m of asArray(d.monsters))
    addId(refs.monsters, typeof m === 'number' ? m : asObj(m)?.id);
  for (const b of asArray(d.bosses)) addId(refs.monsters, typeof b === 'number' ? b : asObj(b)?.id);
  for (const r of asArray(d.requiredObjects)) addId(refs.items, asObj(r)?.id);
  addId(refs.subareas, typeof d.subarea === 'number' ? d.subarea : asObj(d.subarea)?.id);
}

export function collectReferences(input: {
  quests: readonly unknown[];
  achievements: readonly unknown[];
  dungeons: readonly unknown[];
}): ReferencedIds {
  const refs: ReferencedIds = {
    items: new Set(),
    monsters: new Set(),
    npcs: new Set(),
    subareas: new Set(),
    missingAchievementObjectives: new Set(),
  };
  for (const quest of input.quests) collectFromQuest(quest, refs);
  for (const achievement of input.achievements) collectFromAchievement(achievement, refs);
  for (const dungeon of input.dungeons) collectFromDungeon(dungeon, refs);
  return refs;
}

/** Second wave, once the referenced items are known: their drop monsters and recipes. */
export function collectFromItems(items: readonly unknown[]): {
  monsters: Set<number>;
  itemsWithRecipe: Set<number>;
} {
  const monsters = new Set<number>();
  const itemsWithRecipe = new Set<number>();
  for (const item of items) {
    const i = asObj(item);
    if (!i) continue;
    for (const id of asArray(i.dropMonsterIds)) addId(monsters, id);
    if (asArray(i.recipeIds).length > 0) addId(itemsWithRecipe, i.id);
  }
  return { monsters, itemsWithRecipe };
}

/** Ingredient ids of the downloaded recipes. */
export function collectIngredients(recipes: readonly unknown[]): Set<number> {
  const ingredients = new Set<number>();
  for (const recipe of recipes) {
    for (const id of asArray(asObj(recipe)?.ingredientIds)) addId(ingredients, id);
  }
  return ingredients;
}
