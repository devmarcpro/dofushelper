/**
 * Needs and conditions of a plan (SPEC §6.6).
 * Items are computed by simulating the inventory along the plan order, over the nodes that are
 * not done yet: an item that is only SHOWN is not counted twice, and an item that an earlier
 * node of the plan rewards does not have to be farmed.
 */
import type { CompiledAchievement, CompiledQuest, RewardBand } from './dataset';
import type { DungeonNeed, ItemNeed, MonsterNeed, Plan, PlanConditions } from './plan-types';
import type { AlignmentSide, Character, ItemId, NodeKey, Requirement, Reward } from './types';

export interface NeedsIndex {
  quests: ReadonlyMap<number, CompiledQuest>;
  achievements: ReadonlyMap<number, CompiledAchievement>;
  /** Item ids of the "quest item" super type: hidden by default in the UI. */
  questItemIds: ReadonlySet<ItemId>;
}

export interface PlanNeeds {
  needs: { items: ItemNeed[]; monsters: MonsterNeed[]; dungeons: DungeonNeed[] };
  conditions: PlanConditions;
}

type ItemEvent =
  | { t: 'reward'; itemId: ItemId; qty: number; key: NodeKey }
  | { t: 'consume' | 'show'; itemId: ItemId; qty: number; key: NodeKey };

/**
 * Items of a step reward for a character level. Rewards come in level bands (-1 = unbounded).
 * When the level is not filled in, only what every band guarantees is counted.
 */
export function rewardItemsForLevel(
  bands: readonly RewardBand[],
  level: number | null,
): Reward['items'] {
  if (bands.length === 0) return [];
  if (level !== null) {
    const band = bands.find(
      (b) =>
        (b.levelMin === -1 || b.levelMin <= level) && (b.levelMax === -1 || level <= b.levelMax),
    );
    return band ? band.reward.items : [];
  }
  const [first, ...rest] = bands;
  if (!first) return [];
  return first.reward.items
    .map((item) => ({
      itemId: item.itemId,
      qty: Math.min(
        item.qty,
        ...rest.map((b) => b.reward.items.find((i) => i.itemId === item.itemId)?.qty ?? 0),
      ),
    }))
    .filter((item) => item.qty > 0);
}

function positiveItemConditions(
  conditions: readonly Requirement[],
): { itemId: ItemId; qty: number }[] {
  return conditions.flatMap((c) => (c.t === 'hasItem' ? [{ itemId: c.itemId, qty: c.qty }] : []));
}

export function computeNeeds(
  plan: Plan,
  index: NeedsIndex,
  character: Pick<Character, 'inventory' | 'level'>,
): PlanNeeds {
  const events: ItemEvent[] = [];
  const monsters = new Map<number, MonsterNeed>();
  const dungeons = new Map<number, DungeonNeed>();

  const conditions: PlanConditions = {
    level: null,
    jobs: [],
    alignment: null,
    breed: null,
    context: [],
  };
  const jobs = new Map<number, number>();
  const excludedSides = new Set<AlignmentSide>();

  const addDungeons = (ids: readonly number[], key: NodeKey): void => {
    for (const dungeonId of ids) {
      const need = dungeons.get(dungeonId) ?? { dungeonId, usedBy: [] };
      if (!need.usedBy.includes(key)) need.usedBy.push(key);
      dungeons.set(dungeonId, need);
    }
  };
  const addMonster = (monsterId: number, qty: number, singleFight: boolean, key: NodeKey): void => {
    if (monsterId <= 0 || qty <= 0) return;
    const need = monsters.get(monsterId) ?? { monsterId, qty: 0, singleFightMax: 0, usedBy: [] };
    need.qty += qty;
    if (singleFight) need.singleFightMax = Math.max(need.singleFightMax, qty);
    if (!need.usedBy.includes(key)) need.usedBy.push(key);
    monsters.set(monsterId, need);
  };

  for (const node of plan.nodes) {
    if (node.status === 'done' || node.status === 'implied') continue;
    const { key } = node;

    // ----- Conditions -----
    for (const condition of node.conditions) {
      const negated = condition.t === 'not';
      const leaf = condition.t === 'not' ? condition.of : condition;
      if (leaf.t === 'level' && !negated)
        conditions.level = Math.max(conditions.level ?? 0, leaf.min);
      else if (leaf.t === 'jobLevel' && !negated)
        jobs.set(leaf.jobId, Math.max(jobs.get(leaf.jobId) ?? 0, leaf.min));
      else if (leaf.t === 'alignment') {
        if (negated) excludedSides.add(leaf.side);
        else conditions.alignment ??= leaf.side;
      } else if (leaf.t === 'breed' && !negated) conditions.breed ??= leaf.id;
    }
    for (const raw of node.context)
      if (!conditions.context.includes(raw)) conditions.context.push(raw);

    // ----- Item events, monsters, dungeons -----
    for (const item of positiveItemConditions(node.conditions))
      events.push({ t: 'show', ...item, key });

    const id = Number(key.slice(2));
    if (key.startsWith('q:')) {
      const quest = index.quests.get(id);
      if (!quest) continue;
      for (const step of quest.steps) {
        for (const o of step.objectives) {
          switch (o.t) {
            case 'bringItem':
            case 'useItem':
              events.push({ t: 'consume', itemId: o.itemId, qty: o.qty, key });
              break;
            case 'showItem':
              events.push({ t: 'show', itemId: o.itemId, qty: o.qty, key });
              break;
            case 'craft':
              for (const [itemId, qty] of o.ingredients)
                events.push({ t: 'consume', itemId, qty, key });
              break;
            case 'killMonster':
              addMonster(o.monsterId, o.qty, o.singleFight, key);
              addDungeons(o.dungeonIds, key);
              break;
            case 'bringSoul':
              addMonster(o.monsterId, o.qty, false, key);
              addDungeons(o.dungeonIds, key);
              break;
            default:
              break;
          }
        }
        for (const item of rewardItemsForLevel(step.rewardBands, character.level)) {
          events.push({ t: 'reward', itemId: item.itemId, qty: item.qty, key });
        }
      }
    } else {
      for (const item of index.achievements.get(id)?.rewards.items ?? []) {
        events.push({ t: 'reward', itemId: item.itemId, qty: item.qty, key });
      }
    }
  }

  // Neutral is written "not Bonta and not Brâkmar".
  if (conditions.alignment === null && excludedSides.has(1) && excludedSides.has(2))
    conditions.alignment = 0;
  conditions.jobs = [...jobs]
    .map(([jobId, min]) => ({ jobId, min }))
    .sort((a, b) => a.jobId - b.jobId);

  // ----- Inventory simulation, item by item, in plan order -----
  const byItem = new Map<ItemId, ItemEvent[]>();
  for (const event of events) {
    if (event.itemId <= 0 || event.qty <= 0) continue;
    const list = byItem.get(event.itemId);
    if (list) list.push(event);
    else byItem.set(event.itemId, [event]);
  }

  const items: ItemNeed[] = [];
  for (const [itemId, itemEvents] of byItem) {
    if (!itemEvents.some((e) => e.t !== 'reward')) continue; // only rewarded: not a need
    const owned = Math.max(0, character.inventory[itemId] ?? 0);
    let held = owned;
    let toAcquire = 0;
    const need: ItemNeed = {
      itemId,
      toAcquire: 0,
      owned,
      remaining: 0,
      usedBy: [],
      providedBy: [],
      isQuestItem: index.questItemIds.has(itemId),
    };
    for (const event of itemEvents) {
      if (event.t === 'reward') {
        held += event.qty;
        need.providedBy.push({ key: event.key, qty: event.qty });
        continue;
      }
      if (held < event.qty) {
        toAcquire += event.qty - held;
        held = event.qty;
      }
      if (event.t === 'consume') held -= event.qty;
      need.usedBy.push({ key: event.key, qty: event.qty, consumed: event.t === 'consume' });
    }
    need.toAcquire = toAcquire;
    need.remaining = toAcquire;
    items.push(need);
  }

  return {
    needs: {
      items: items.sort((a, b) => a.itemId - b.itemId),
      monsters: [...monsters.values()].sort((a, b) => a.monsterId - b.monsterId),
      dungeons: [...dungeons.values()].sort((a, b) => a.dungeonId - b.dungeonId),
    },
    conditions,
  };
}
