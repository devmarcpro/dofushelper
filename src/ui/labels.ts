/** Names of things, looked up in the loaded dataset. Pure: built once per dataset. */
import type {
  CompiledAchievement,
  CompiledDataset,
  CompiledItem,
  CompiledQuest,
} from '../core/dataset';
import type { Goal, NodeKey } from '../core/types';

export interface Labels {
  quest(id: number): CompiledQuest | undefined;
  achievement(id: number): CompiledAchievement | undefined;
  item(id: number): CompiledItem | undefined;
  /** `null` when the dataset does not know the entity: the UI then shows the id, never a guess. */
  nodeName(key: NodeKey): string | null;
  goalName(goal: Goal): string | null;
  itemName(id: number): string | null;
  monsterName(id: number): string | null;
  npcName(id: number): string | null;
  dungeonName(id: number): string | null;
  dungeonLevel(id: number): number | null;
  /** Lowest and highest drop rate over the five monster grades, in percent. */
  monsterDrop(monsterId: number, itemId: number): { min: number; max: number };
  subareaName(id: number): string | null;
  jobName(id: number): string | null;
  breedName(id: number): string | null;
  /** Splits a game text such as "Aller voir {npc,447}" into plain parts and resolved tags. */
  textParts(text: string): TextPart[];
}

export type TextPart =
  { t: 'text'; value: string } | { t: 'ref'; kind: string; id: number; name: string | null };

const TAG = /\{(\w+),(\d+)\}/g;

export function createLabels(dataset: CompiledDataset): Labels {
  const byId = <T extends { id: number }>(list: readonly T[]): Map<number, T> =>
    new Map(list.map((x) => [x.id, x]));
  const quests = byId(dataset.quests);
  const achievements = byId(dataset.achievements);
  const items = byId(dataset.items);
  const monsters = byId(dataset.monsters);
  const dungeons = byId(dataset.dungeons);
  const npcs = byId(dataset.refs.npcs);
  const subareas = byId(dataset.refs.subareas);
  const jobs = byId(dataset.refs.jobs);
  const breeds = byId(dataset.refs.breeds);
  const name = (entry: { name: string } | undefined): string | null =>
    entry && entry.name.length > 0 ? entry.name : null;

  const tagName = (kind: string, id: number): string | null => {
    switch (kind) {
      case 'npc':
        return name(npcs.get(id));
      case 'item':
        return name(items.get(id));
      case 'monster':
        return name(monsters.get(id));
      case 'subarea':
        return name(subareas.get(id));
      case 'quest':
        return name(quests.get(id));
      default:
        return null;
    }
  };

  const labels: Labels = {
    quest: (id) => quests.get(id),
    achievement: (id) => achievements.get(id),
    item: (id) => items.get(id),
    nodeName: (key) => {
      const id = Number(key.slice(2));
      return name(key.startsWith('q:') ? quests.get(id) : achievements.get(id));
    },
    goalName: (goal) =>
      goal.t === 'item'
        ? name(items.get(goal.itemId))
        : labels.nodeName(goal.t === 'quest' ? `q:${goal.id}` : `a:${goal.id}`),
    itemName: (id) => name(items.get(id)),
    monsterName: (id) => name(monsters.get(id)),
    npcName: (id) => name(npcs.get(id)),
    dungeonName: (id) => name(dungeons.get(id)),
    dungeonLevel: (id) => dungeons.get(id)?.level ?? null,
    monsterDrop: (monsterId, itemId) => {
      const rates = monsters.get(monsterId)?.drops.find(([id]) => id === itemId)?.[1] ?? [];
      return rates.length === 0
        ? { min: 0, max: 0 }
        : { min: Math.min(...rates), max: Math.max(...rates) };
    },
    subareaName: (id) => name(subareas.get(id)),
    jobName: (id) => name(jobs.get(id)),
    breedName: (id) => name(breeds.get(id)),
    textParts: (text) => {
      const parts: TextPart[] = [];
      let last = 0;
      for (const match of text.matchAll(TAG)) {
        const index = match.index;
        if (index > last) parts.push({ t: 'text', value: text.slice(last, index) });
        const kind = match[1] ?? '';
        const id = Number(match[2]);
        parts.push({ t: 'ref', kind, id, name: tagName(kind, id) });
        last = index + match[0].length;
      }
      if (last < text.length) parts.push({ t: 'text', value: text.slice(last) });
      return parts;
    },
  };
  return labels;
}
