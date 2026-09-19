/**
 * Pure sub-graph extraction from the compiled dataset (M1-5): the closure of the Qf / QF / OA
 * prerequisites of a goal, every branch of every `|` included (an upper bound of the plan),
 * plus the entities those nodes reference. Cycles and missing ids never throw.
 * The real engine (graph, choice points, statuses) arrives in M2 in src/core.
 */
import type { CriterionAst } from '../../src/core/criteria';
import type {
  CompiledAchievement,
  CompiledCriterion,
  CompiledDataset,
  CompiledQuest,
} from '../../src/core/dataset';

export type NodeKey = `q:${number}` | `a:${number}`;

export type GoalSpec =
  { t: 'item'; itemId: number } | { t: 'quest'; id: number } | { t: 'achievement'; id: number };

/** Positive prerequisites of a criterion. Negated atoms (`Qf!216`) are exclusions, not prerequisites. */
export function prerequisiteKeys(criterion: CompiledCriterion | null | undefined): NodeKey[] {
  const keys: NodeKey[] = [];
  const visit = (ast: CriterionAst): void => {
    if (ast.k !== 'atom') {
      for (const item of ast.items) visit(item);
      return;
    }
    const id = ast.args[0];
    if (typeof id !== 'number' || ast.op === '!') return;
    if (ast.key === 'Qf' || ast.key === 'QF') keys.push(`q:${id}`);
    else if (ast.key === 'OA') keys.push(`a:${id}`);
  };
  if (criterion?.ast) visit(criterion.ast);
  return keys;
}

export interface DatasetIndex {
  quests: Map<number, CompiledQuest>;
  achievements: Map<number, CompiledAchievement>;
}

export function indexDataset(dataset: CompiledDataset): DatasetIndex {
  return {
    quests: new Map(dataset.quests.map((q) => [q.id, q])),
    achievements: new Map(dataset.achievements.map((a) => [a.id, a])),
  };
}

function directPrerequisites(index: DatasetIndex, key: NodeKey): NodeKey[] | null {
  const id = Number(key.slice(2));
  if (key.startsWith('q:')) {
    const quest = index.quests.get(id);
    return quest ? prerequisiteKeys(quest.start) : null;
  }
  const achievement = index.achievements.get(id);
  return achievement ? achievement.objectives.flatMap((o) => prerequisiteKeys(o.criterion)) : null;
}

export function goalRoots(dataset: CompiledDataset, goal: GoalSpec): NodeKey[] {
  if (goal.t === 'quest') return [`q:${goal.id}`];
  if (goal.t === 'achievement') return [`a:${goal.id}`];
  const item = dataset.items.find((i) => i.id === goal.itemId);
  if (!item) return [];
  return [
    ...item.questsThatReward.map((id): NodeKey => `q:${id}`),
    ...item.achievementsThatReward.map((id): NodeKey => `a:${id}`),
  ];
}

export interface Closure {
  nodes: Set<NodeKey>;
  /** Keys cited by a criterion but absent from the dataset. */
  missing: Set<NodeKey>;
}

export function closure(index: DatasetIndex, roots: readonly NodeKey[]): Closure {
  const nodes = new Set<NodeKey>();
  const missing = new Set<NodeKey>();
  const stack = [...roots];
  while (stack.length > 0) {
    const key = stack.pop();
    if (key === undefined || nodes.has(key) || missing.has(key)) continue;
    const next = directPrerequisites(index, key);
    if (next === null) {
      missing.add(key);
      continue;
    }
    nodes.add(key);
    stack.push(...next);
  }
  return { nodes, missing };
}

/** The part of the dataset needed to work on one goal, in the compiled dataset format. */
export function extractSubgraph(
  dataset: CompiledDataset,
  goal: GoalSpec,
): { dataset: CompiledDataset; missing: NodeKey[] } {
  const index = indexDataset(dataset);
  const { nodes, missing } = closure(index, goalRoots(dataset, goal));
  const quests = dataset.quests.filter((q) => nodes.has(`q:${q.id}`));
  const achievements = dataset.achievements.filter((a) => nodes.has(`a:${a.id}`));

  const itemIds = new Set<number>();
  const monsterIds = new Set<number>();
  const npcIds = new Set<number>();
  const subareaIds = new Set<number>();
  const dungeonIds = new Set<number>();
  if (goal.t === 'item') itemIds.add(goal.itemId);

  const fromCriterion = (criterion: CompiledCriterion | null): void => {
    const visit = (ast: CriterionAst): void => {
      if (ast.k !== 'atom') return ast.items.forEach(visit);
      const [first, second] = ast.args;
      if ((ast.key === 'PO' || ast.key === 'HD') && typeof first === 'number') itemIds.add(first);
      if (['DD', 'DH', 'DM'].includes(ast.key) && typeof second === 'number') itemIds.add(second);
      if (ast.key === 'EM' && typeof first === 'number') monsterIds.add(first);
    };
    if (criterion?.ast) visit(criterion.ast);
  };

  for (const quest of quests) {
    fromCriterion(quest.start);
    for (const position of quest.startPositions)
      if (position.npcId !== null) npcIds.add(position.npcId);
    for (const item of quest.rewards.items) itemIds.add(item.itemId);
    for (const step of quest.steps) {
      for (const band of step.rewardBands)
        for (const item of band.reward.items) itemIds.add(item.itemId);
      for (const o of step.objectives) {
        if ('itemId' in o && o.itemId > 0) itemIds.add(o.itemId);
        if ('monsterId' in o && o.monsterId > 0) monsterIds.add(o.monsterId);
        if ('npcId' in o && o.npcId !== null && o.npcId > 0) npcIds.add(o.npcId);
        if ('dungeonIds' in o) for (const id of o.dungeonIds) dungeonIds.add(id);
        if (o.t === 'goTo' && o.subareaId !== null) subareaIds.add(o.subareaId);
        if (o.t === 'craft') for (const [id] of o.ingredients) itemIds.add(id);
      }
    }
  }
  for (const achievement of achievements) {
    for (const objective of achievement.objectives) fromCriterion(objective.criterion);
    for (const item of achievement.rewards.items) itemIds.add(item.itemId);
  }

  // One level of recipe ingredients, as in the full dataset.
  for (const item of dataset.items) {
    if (itemIds.has(item.id) && item.recipe)
      for (const [id] of item.recipe.ingredients) itemIds.add(id);
  }
  const items = dataset.items.filter((i) => itemIds.has(i.id));
  for (const item of items) for (const id of item.dropMonsterIds) monsterIds.add(id);

  const dungeons = dataset.dungeons.filter((d) => dungeonIds.has(d.id));
  for (const dungeon of dungeons)
    for (const id of [...dungeon.monsterIds, ...dungeon.bossIds]) monsterIds.add(id);

  const monsters = dataset.monsters
    .filter((m) => monsterIds.has(m.id))
    .map((m) => ({ ...m, drops: m.drops.filter(([itemId]) => itemIds.has(itemId)) }));

  const typeIds = new Set(items.map((i) => i.typeId));
  const questCategoryIds = new Set(quests.map((q) => q.categoryId));
  const achievementCategoryIds = new Set(achievements.map((a) => a.categoryId));

  return {
    missing: [...missing].sort(),
    dataset: {
      quests,
      achievements,
      items,
      monsters,
      dungeons,
      goals: dataset.goals.filter((g) => goal.t === 'item' && g.goal.itemId === goal.itemId),
      refs: {
        ...dataset.refs,
        questCategories: dataset.refs.questCategories.filter((c) => questCategoryIds.has(c.id)),
        achievementCategories: dataset.refs.achievementCategories.filter((c) =>
          achievementCategoryIds.has(c.id),
        ),
        itemTypes: dataset.refs.itemTypes.filter((t) => typeIds.has(t.id)),
        npcs: dataset.refs.npcs.filter((n) => npcIds.has(n.id)),
        subareas: dataset.refs.subareas.filter((s) => subareaIds.has(s.id)),
      },
    },
  };
}

export interface CatalogRow {
  itemId: number;
  name: string;
  level: number | null;
  sources: string;
  quests: number;
  achievements: number;
  nodes: number;
  missing: number;
}

/** One row per goal preset, sorted by plan size (upper bound), then by item id. */
export function catalogTable(dataset: CompiledDataset): CatalogRow[] {
  const index = indexDataset(dataset);
  return dataset.goals
    .map((preset): CatalogRow => {
      const { nodes, missing } = closure(index, goalRoots(dataset, preset.goal));
      const questCount = [...nodes].filter((k) => k.startsWith('q:')).length;
      return {
        itemId: preset.goal.itemId,
        name: preset.name,
        level: preset.level,
        sources: [
          ...preset.sources.quests.map((id) => `quête ${id}`),
          ...preset.sources.achievements.map((id) => `succès ${id}`),
        ].join(', '),
        quests: questCount,
        achievements: nodes.size - questCount,
        nodes: nodes.size,
        missing: missing.size,
      };
    })
    .sort((a, b) => a.nodes - b.nodes || a.itemId - b.itemId);
}
