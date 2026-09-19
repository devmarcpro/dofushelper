/**
 * Public face of the core (SPEC §6.8): one engine per loaded dataset.
 * The graph and the indexes are built once; every resolution is a full, stateless
 * recomputation from the character's explicit facts (golden rule 6).
 */
import type { CompiledDataset, GoalPreset } from './dataset';
import { buildGraph, type Graph } from './graph';
import { computeNeeds, type NeedsIndex, type PlanNeeds } from './needs';
import { resolvePlan } from './plan';
import type { Plan } from './plan-types';
import type { Character, Goal, ItemId, NodeKey } from './types';

export type FullPlan = Plan & PlanNeeds;

export interface Engine {
  graph: Graph;
  resolve(goal: Goal, character: Character): FullPlan;
  itemSources(itemId: ItemId): NodeKey[];
  catalog: GoalPreset[];
}

/** Goals offered by default: the dataset's presets ("Dofus" items that have a source). */
export function listGoalCatalog(dataset: Pick<CompiledDataset, 'goals'>): GoalPreset[] {
  return [...dataset.goals].sort(
    (a, b) => a.name.localeCompare(b.name, 'fr') || a.goal.itemId - b.goal.itemId,
  );
}

export function createEngine(dataset: CompiledDataset): Engine {
  const graph = buildGraph(dataset);
  const sources = new Map<ItemId, NodeKey[]>();
  for (const item of dataset.items) {
    const keys: NodeKey[] = [
      ...item.questsThatReward.map((id): NodeKey => `q:${id}`),
      ...item.achievementsThatReward.map((id): NodeKey => `a:${id}`),
    ];
    if (keys.length > 0) sources.set(item.id, keys);
  }
  const index: NeedsIndex = {
    quests: new Map(dataset.quests.map((q) => [q.id, q])),
    achievements: new Map(dataset.achievements.map((a) => [a.id, a])),
    questItemIds: new Set(dataset.items.filter((i) => i.isQuestItem).map((i) => i.id)),
  };
  const itemSources = (itemId: ItemId): NodeKey[] => sources.get(itemId) ?? [];

  return {
    graph,
    itemSources,
    catalog: listGoalCatalog(dataset),
    resolve(goal, character) {
      const plan = resolvePlan(graph, goal, character, { itemSources });
      return { ...plan, ...computeNeeds(plan, index, character) };
    },
  };
}
