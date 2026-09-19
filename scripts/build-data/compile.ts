/**
 * Pure compilation: raw DofusDB tables + overrides → compiled dataset (DATA_SOURCES.md §6).
 * No file system, no clock: deterministic by construction. Unexpected shapes never throw
 * (golden rule 7): they are skipped and reported in `warnings`.
 */
import {
  compileCriterion,
  compileCriterionWithOverride,
  parseRequirementLeaf,
  type OverrideOutcome,
} from '../../src/core/criterion';
import type {
  CompiledAchievement,
  CompiledDataset,
  CompiledDungeon,
  CompiledItem,
  CompiledMonster,
  CompiledQuest,
  CompiledStep,
  DbNeed,
  GoalPreset,
  NamedRef,
  NodeOverride,
  RewardBand,
} from '../../src/core/dataset';
import type { Objective, Reward } from '../../src/core/types';
import { OBJECTIVE_KINDS, SINGLE_FIGHT_TYPES } from './objective-types';

export interface RawSnapshot {
  gameVersion: string;
  tables: Readonly<Record<string, readonly unknown[]>>;
}

export interface Overrides {
  quests: Readonly<Record<string, NodeOverride>>;
  achievements: Readonly<Record<string, NodeOverride>>;
  items: Readonly<Record<string, { isQuestItem?: boolean; reason: string; source: string }>>;
}

export const EMPTY_OVERRIDES: Overrides = { quests: {}, achievements: {}, items: {} };

export interface CompileResult {
  dataset: CompiledDataset;
  /** Fatal problems: the build must fail (e.g. an override targets an id absent from the snapshot). */
  errors: string[];
  /** Non fatal oddities, listed by data:report. */
  warnings: string[];
  /** Overrides that no longer change anything: the upstream data was fixed (SPEC §7). */
  obsoleteOverrides: string[];
}

type Obj = Record<string, unknown>;

const asObj = (v: unknown): Obj | undefined =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asNum = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const asBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const numList = (v: unknown): number[] =>
  asArray(v)
    .filter((x): x is number => typeof x === 'number')
    .sort((a, b) => a - b);
const byId = <T extends { id: number }>(list: T[]): T[] => list.sort((a, b) => a.id - b.id);

export { compileCriterion };

function emptyReward(): Reward {
  return { items: [], titles: [], ornaments: [], emotes: [], spells: [] };
}

function sortReward(reward: Reward): Reward {
  reward.items.sort((a, b) => a.itemId - b.itemId);
  for (const key of ['titles', 'ornaments', 'emotes', 'spells'] as const) {
    reward[key] = [...new Set(reward[key])].sort((a, b) => a - b);
  }
  return reward;
}

function addItems(reward: Reward, itemId: number, qty: number): void {
  const existing = reward.items.find((i) => i.itemId === itemId);
  if (existing) existing.qty += qty;
  else reward.items.push({ itemId, qty });
}

export function compileDataset(
  raw: RawSnapshot,
  overrides: Overrides,
  lang: string,
): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const obsoleteOverrides: string[] = [];

  /** Turns the outcome of an override into build errors and obsolete-override notes. */
  const recordOutcome = (where: string, outcome: OverrideOutcome): void => {
    for (const bad of outcome.invalidAdditions) {
      errors.push(`${where} : addRequires contient une entrée invalide ${JSON.stringify(bad)}`);
    }
    for (const atom of outcome.unusedRemovals) {
      obsoleteOverrides.push(
        `${where} : « ${atom} » à retirer n'apparaît plus dans le critère du jeu`,
      );
    }
    for (const leaf of outcome.redundantAdditions) {
      obsoleteOverrides.push(
        `${where} : ${JSON.stringify(leaf)} à ajouter est déjà exigé par le jeu`,
      );
    }
  };
  const table = (name: string): readonly unknown[] => raw.tables[name] ?? [];
  const text = (v: unknown): string => {
    const o = asObj(v);
    const value = o?.[lang];
    return typeof value === 'string' ? value : '';
  };
  const namedRefs = (name: string, field = 'name'): NamedRef[] =>
    byId(
      table(name).flatMap((row) => {
        const o = asObj(row);
        const id = asNum(o?.id);
        return o && id !== null ? [{ id, name: text(o[field]) }] : [];
      }),
    );

  // ---------- Quests ----------
  function compileObjective(rawObjective: unknown): Objective | null {
    const o = asObj(rawObjective);
    const id = asNum(o?.id);
    if (!o || id === null) return null;
    const typeId = asNum(o.typeId) ?? -1;
    const p = asObj(o.parameters) ?? {};
    const p0 = asNum(p.parameter0) ?? 0;
    const p1 = asNum(p.parameter1) ?? 0;
    const p2 = asNum(p.parameter2) ?? 0;
    const generated = asObj(asObj(o.need)?.generated);
    const dungeonIds = numList(generated?.dungeons);
    const base = { id, text: text(o.text) };
    const kind = OBJECTIVE_KINDS[typeId];
    switch (kind) {
      case 'talkTo':
        return { ...base, t: 'talkTo', npcId: p0 };
      case 'showItem':
      case 'bringItem':
        return { ...base, t: kind, npcId: p0 > 0 ? p0 : null, itemId: p1, qty: p2 };
      case 'goTo':
        return typeId === 5
          ? { ...base, t: 'goTo', mapId: null, subareaId: p0 }
          : { ...base, t: 'goTo', mapId: p0, subareaId: null };
      case 'killMonster':
        return {
          ...base,
          t: 'killMonster',
          monsterId: p0,
          qty: p1,
          singleFight: SINGLE_FIGHT_TYPES.has(typeId),
          mapId: typeId === 16 && p2 > 0 ? p2 : null,
          dungeonIds,
        };
      case 'bringSoul':
        return {
          ...base,
          t: 'bringSoul',
          npcId: p0 > 0 ? p0 : null,
          monsterId: p1,
          qty: p2,
          dungeonIds,
        };
      case 'craft': {
        const ids = asArray(generated?.items);
        const quantities = asArray(generated?.quantities);
        const ingredients: [number, number][] = [];
        ids.forEach((itemId, index) => {
          const qty = asNum(quantities[index]);
          if (typeof itemId === 'number' && qty !== null) ingredients.push([itemId, qty]);
        });
        return { ...base, t: 'craft', itemId: p0, qty: p1, ingredients };
      }
      default:
        return { ...base, t: 'other', typeId };
    }
  }

  function compileStepReward(rawReward: unknown): RewardBand | null {
    const r = asObj(rawReward);
    if (!r) return null;
    const reward = emptyReward();
    for (const pair of asArray(r.itemsReward)) {
      const [itemId, qty] = asArray(pair);
      if (typeof itemId === 'number' && typeof qty === 'number') addItems(reward, itemId, qty);
    }
    reward.titles = numList(r.titlesReward);
    reward.emotes = numList(r.emotesReward);
    reward.spells = numList(r.spellsReward);
    return {
      levelMin: asNum(r.levelMin) ?? -1,
      levelMax: asNum(r.levelMax) ?? -1,
      reward: sortReward(reward),
    };
  }

  /** The game stores one reward row per character level: merge contiguous identical rows. */
  function mergeBands(bands: RewardBand[]): RewardBand[] {
    const sorted = [...bands].sort((a, b) => a.levelMin - b.levelMin || a.levelMax - b.levelMax);
    const merged: RewardBand[] = [];
    for (const band of sorted) {
      const last = merged[merged.length - 1];
      if (
        last &&
        JSON.stringify(last.reward) === JSON.stringify(band.reward) &&
        band.levelMin <= last.levelMax + 1 &&
        last.levelMax !== -1
      ) {
        last.levelMax = Math.max(last.levelMax, band.levelMax);
      } else {
        merged.push({ ...band });
      }
    }
    return merged;
  }

  function compileNeed(v: unknown): DbNeed | null {
    const n = asObj(v);
    if (!n) return null;
    const ids = asArray(n.items);
    const quantities = asArray(n.quantities);
    const items: [number, number][] = [];
    ids.forEach((itemId, index) => {
      if (typeof itemId === 'number') items.push([itemId, asNum(quantities[index]) ?? 1]);
    });
    items.sort((a, b) => a[0] - b[0]);
    return { items, quests: numList(n.quests), achievements: numList(n.achievements) };
  }

  const compileStart = (id: number, rawCriterion: string) => {
    const outcome = compileCriterionWithOverride(rawCriterion, overrides.quests[String(id)]);
    recordOutcome(`overrides/quests.json, quête ${id}`, outcome);
    return outcome.criterion;
  };

  const quests: CompiledQuest[] = [];
  for (const row of table('quests')) {
    const q = asObj(row);
    const id = asNum(q?.id);
    if (!q || id === null) {
      warnings.push('quests: ligne sans id ignorée');
      continue;
    }
    const steps: CompiledStep[] = [];
    const questReward = emptyReward();
    for (const rawStep of asArray(q.steps)) {
      const s = asObj(rawStep);
      const stepId = asNum(s?.id);
      if (!s || stepId === null) {
        warnings.push(`quête ${id} : étape illisible ignorée`);
        continue;
      }
      const objectives = asArray(s.objectives).flatMap((o) => {
        const compiled = compileObjective(o);
        if (!compiled) warnings.push(`quête ${id}, étape ${stepId} : objectif illisible ignoré`);
        return compiled ? [compiled] : [];
      });
      const rewardBands = mergeBands(
        asArray(s.rewards).flatMap((r) => {
          const band = compileStepReward(r);
          return band ? [band] : [];
        }),
      );
      // A character gets one band only: keep, per item, the largest quantity over the bands.
      const stepItems = new Map<number, number>();
      for (const band of rewardBands) {
        for (const item of band.reward.items) {
          stepItems.set(item.itemId, Math.max(stepItems.get(item.itemId) ?? 0, item.qty));
        }
        questReward.titles.push(...band.reward.titles);
        questReward.emotes.push(...band.reward.emotes);
        questReward.spells.push(...band.reward.spells);
      }
      for (const [itemId, qty] of stepItems) addItems(questReward, itemId, qty);
      steps.push({
        id: stepId,
        name: text(s.name),
        optimalLevel: asNum(s.optimalLevel),
        objectives,
        rewardBands,
      });
    }
    // Steps keep the game order given by stepIds.
    const order = numListUnsorted(q.stepIds);
    steps.sort((a, b) => indexOrEnd(order, a.id) - indexOrEnd(order, b.id) || a.id - b.id);

    const compiled: CompiledQuest = {
      id,
      name: text(q.name),
      categoryId: asNum(q.categoryId),
      levelMin: asNum(q.levelMin) ?? 0,
      levelMax: asNum(q.levelMax) ?? 0,
      isDungeonQuest: asBool(q.isDungeonQuest) ?? false,
      isPartyQuest: asBool(q.isPartyQuest),
      isEvent: asBool(q.isEvent),
      repeatType: asNum(q.repeatType),
      repeatLimit: asNum(q.repeatLimit),
      start: compileStart(id, typeof q.startCriterion === 'string' ? q.startCriterion : ''),
      startPositions: asArray(q.startPosition).flatMap((pos) => {
        const o = asObj(pos);
        return o ? [{ mapId: asNum(o.mapId), npcId: asNum(o.npcId) }] : [];
      }),
      steps,
      rewards: sortReward(questReward),
      dbNeed: compileNeed(q.need),
    };
    const override = overrides.quests[String(id)];
    if (override) compiled.override = override;
    quests.push(compiled);
  }
  byId(quests);

  // ---------- Achievements ----------
  const achievements: CompiledAchievement[] = [];
  for (const row of table('achievements')) {
    const a = asObj(row);
    const id = asNum(a?.id);
    if (!a || id === null) {
      warnings.push('achievements: ligne sans id ignorée');
      continue;
    }
    const objectives = asArray(a.objectives).flatMap((rawObjective) => {
      const o = asObj(rawObjective);
      const objectiveId = asNum(o?.id);
      if (!o || objectiveId === null) return [];
      return [
        {
          id: objectiveId,
          name: text(o.name),
          order: asNum(o.order),
          criterion: compileCriterion(typeof o.criterion === 'string' ? o.criterion : ''),
        },
      ];
    });
    objectives.sort((x, y) => (x.order ?? 0) - (y.order ?? 0) || x.id - y.id);
    const achievementOverride = overrides.achievements[String(id)];
    if (achievementOverride) {
      const where = `overrides/achievements.json, succès ${id}`;
      const removals = achievementOverride.removeRequires ?? [];
      const unused = new Set(removals);
      for (const objective of objectives) {
        const outcome = compileCriterionWithOverride(objective.criterion.raw, {
          removeRequires: removals,
        });
        objective.criterion = outcome.criterion;
        for (const atom of removals)
          if (!outcome.unusedRemovals.includes(atom)) unused.delete(atom);
      }
      const already = new Set(objectives.map((o) => JSON.stringify(o.criterion.req)));
      const additions = (achievementOverride.addRequires ?? []).map((candidate) => ({
        candidate,
        leaf: parseRequirementLeaf(candidate),
      }));
      recordOutcome(where, {
        criterion: compileCriterion(''),
        unusedRemovals: [...unused],
        redundantAdditions: additions.flatMap((a) =>
          a.leaf && already.has(JSON.stringify(a.leaf)) ? [a.leaf] : [],
        ),
        invalidAdditions: additions.filter((a) => !a.leaf).map((a) => a.candidate),
      });
      let added = 0;
      for (const { leaf } of additions) {
        if (!leaf || already.has(JSON.stringify(leaf))) continue;
        added += 1;
        objectives.push({
          id: -added,
          name: achievementOverride.flags?.note ?? 'Prérequis ajouté manuellement',
          order: null,
          criterion: { raw: '', req: leaf },
        });
      }
    }
    const embedded = new Set(objectives.map((o) => o.id));
    const reward = emptyReward();
    for (const rawReward of asArray(a.rewards)) {
      const r = asObj(rawReward);
      if (!r) continue;
      const ids = asArray(r.itemsReward);
      const quantities = asArray(r.itemsQuantityReward);
      ids.forEach((itemId, index) => {
        if (typeof itemId === 'number') addItems(reward, itemId, asNum(quantities[index]) ?? 1);
      });
      reward.titles.push(...numList(r.titlesReward));
      reward.ornaments.push(...numList(r.ornamentsReward));
      reward.emotes.push(...numList(r.emotesReward));
      reward.spells.push(...numList(r.spellsReward));
    }
    const compiled: CompiledAchievement = {
      id,
      name: text(a.name),
      description: text(a.description),
      categoryId: asNum(a.categoryId) ?? 0,
      points: asNum(a.points),
      level: asNum(a.level),
      order: asNum(a.order),
      accountLinked: asBool(a.accountLinked),
      objectives,
      missingObjectiveIds: numList(a.objectiveIds).filter(
        (objectiveId) => !embedded.has(objectiveId),
      ),
      rewards: sortReward(reward),
      dbNeed: compileNeed(a.need),
    };
    const override = overrides.achievements[String(id)];
    if (override) compiled.override = override;
    achievements.push(compiled);
  }
  byId(achievements);

  // ---------- Items ----------
  const questSuperType = table('item-super-types').find(
    (t) => asObj(asObj(t)?.name)?.fr === 'Objet de quête',
  );
  const questSuperTypeId = asNum(asObj(questSuperType)?.id);
  if (questSuperTypeId === null)
    warnings.push('super-type « Objet de quête » introuvable : isQuestItem vaut faux partout');
  const superTypeOf = new Map<number, number | null>();
  for (const t of table('item-types')) {
    const o = asObj(t);
    const id = asNum(o?.id);
    if (o && id !== null) superTypeOf.set(id, asNum(o.superTypeId));
  }
  const recipeOf = new Map<number, Obj>();
  for (const r of table('recipes')) {
    const o = asObj(r);
    const resultId = asNum(o?.resultId);
    if (o && resultId !== null && !recipeOf.has(resultId)) recipeOf.set(resultId, o);
  }

  const itemsById = new Map<number, CompiledItem>();
  for (const name of ['items', 'dofus-items', 'ingredient-items']) {
    for (const row of table(name)) {
      const i = asObj(row);
      const id = asNum(i?.id);
      if (!i || id === null || itemsById.has(id)) continue;
      const typeId = asNum(i.typeId) ?? 0;
      const recipe = recipeOf.get(id);
      const ingredientIds = asArray(recipe?.ingredientIds);
      const quantities = asArray(recipe?.quantities);
      const forced = overrides.items[String(id)]?.isQuestItem;
      itemsById.set(id, {
        id,
        name: text(i.name),
        typeId,
        level: asNum(i.level),
        iconId: asNum(i.iconId),
        isQuestItem:
          forced ?? (questSuperTypeId !== null && superTypeOf.get(typeId) === questSuperTypeId),
        criterion:
          typeof i.criterions === 'string' && i.criterions.length > 0
            ? compileCriterion(i.criterions)
            : null,
        dropMonsterIds: numList(i.dropMonsterIds),
        recipe: recipe
          ? {
              jobId: asNum(recipe.jobId),
              ingredients: ingredientIds.flatMap((ingredientId, index): [number, number][] =>
                typeof ingredientId === 'number'
                  ? [[ingredientId, asNum(quantities[index]) ?? 1]]
                  : [],
              ),
            }
          : null,
        questsThatReward: numList(i.questsThatReward),
        achievementsThatReward: numList(i.achievementsThatReward),
      });
    }
  }
  const items = byId([...itemsById.values()]);

  // ---------- Monsters, dungeons ----------
  const monsters: CompiledMonster[] = byId(
    table('monsters').flatMap((row): CompiledMonster[] => {
      const m = asObj(row);
      const id = asNum(m?.id);
      if (!m || id === null) return [];
      const drops: [number, number[]][] = [];
      for (const rawDrop of asArray(m.drops)) {
        const d = asObj(rawDrop);
        const itemId = asNum(d?.objectId);
        if (!d || itemId === null || !itemsById.has(itemId)) continue;
        drops.push([
          itemId,
          [1, 2, 3, 4, 5].map((grade) => asNum(d[`percentDropForGrade${grade}`]) ?? 0),
        ]);
      }
      drops.sort((x, y) => x[0] - y[0]);
      return [
        {
          id,
          name: text(m.name),
          isBoss: asBool(m.isBoss) ?? false,
          isMiniBoss: asBool(m.isMiniBoss) ?? false,
          drops,
        },
      ];
    }),
  );

  const dungeons: CompiledDungeon[] = byId(
    table('dungeons').flatMap((row): CompiledDungeon[] => {
      const d = asObj(row);
      const id = asNum(d?.id);
      if (!d || id === null) return [];
      return [
        {
          id,
          name: text(d.name),
          level: asNum(d.optimalPlayerLevel),
          minLevel: asNum(d.minLevel),
          monsterIds: numList(d.monsters),
          bossIds: numList(d.bosses),
          requiredItems: asArray(d.requiredObjects)
            .flatMap((r): [number, number][] => {
              const o = asObj(r);
              const itemId = asNum(o?.id);
              return itemId !== null ? [[itemId, asNum(o?.quantity) ?? 1]] : [];
            })
            .sort((x, y) => x[0] - y[0]),
        },
      ];
    }),
  );

  // ---------- Goal catalog: "Dofus" items that have a source ----------
  const goals: GoalPreset[] = byIdGoal(
    table('dofus-items').flatMap((row): GoalPreset[] => {
      const id = asNum(asObj(row)?.id);
      const item = id !== null ? itemsById.get(id) : undefined;
      if (!item) return [];
      if (item.questsThatReward.length === 0 && item.achievementsThatReward.length === 0) {
        warnings.push(`objet Dofus ${item.id} « ${item.name} » sans source : absent du catalogue`);
        return [];
      }
      return [
        {
          goal: { t: 'item', itemId: item.id },
          name: item.name,
          level: item.level,
          sources: { quests: item.questsThatReward, achievements: item.achievementsThatReward },
        },
      ];
    }),
  );

  // ---------- Overrides must target existing ids ----------
  const questIds = new Set(quests.map((q) => q.id));
  const achievementIds = new Set(achievements.map((a) => a.id));
  const checks: [
    string,
    Readonly<Record<string, { reason: string; source: string }>>,
    (id: number) => boolean,
  ][] = [
    ['quests', overrides.quests, (id) => questIds.has(id)],
    ['achievements', overrides.achievements, (id) => achievementIds.has(id)],
    ['items', overrides.items, (id) => itemsById.has(id)],
  ];
  for (const [file, entries, exists] of checks) {
    for (const [key, entry] of Object.entries(entries)) {
      if (!exists(Number(key)))
        errors.push(
          `overrides/${file}.json : l'id ${key} est absent du snapshot ${raw.gameVersion}`,
        );
      if (!entry.reason || !entry.source)
        errors.push(
          `overrides/${file}.json : l'entrée ${key} doit porter « reason » et « source »`,
        );
    }
  }

  const questCategories = byId(
    table('quest-categories').flatMap((row) => {
      const o = asObj(row);
      const id = asNum(o?.id);
      return o && id !== null ? [{ id, name: text(o.name), order: asNum(o.order) }] : [];
    }),
  );
  const achievementCategories = byId(
    table('achievement-categories').flatMap((row) => {
      const o = asObj(row);
      const id = asNum(o?.id);
      return o && id !== null
        ? [{ id, name: text(o.name), parentId: asNum(o.parentId), order: asNum(o.order) }]
        : [];
    }),
  );
  const usedTypeIds = new Set(items.map((i) => i.typeId));
  const itemTypes = byId(
    table('item-types').flatMap((row) => {
      const o = asObj(row);
      const id = asNum(o?.id);
      return o && id !== null && usedTypeIds.has(id)
        ? [{ id, name: text(o.name), superTypeId: asNum(o.superTypeId) }]
        : [];
    }),
  );

  return {
    dataset: {
      quests,
      achievements,
      items,
      monsters,
      dungeons,
      goals,
      refs: {
        questCategories,
        achievementCategories,
        jobs: namedRefs('jobs'),
        breeds: namedRefs('breeds', 'shortName'),
        alignmentSides: namedRefs('alignment-sides'),
        itemTypes,
        itemSuperTypes: namedRefs('item-super-types'),
        objectiveTypes: namedRefs('quest-objective-types'),
        npcs: namedRefs('npcs'),
        subareas: namedRefs('subareas'),
      },
    },
    errors,
    warnings,
    obsoleteOverrides,
  };
}

function numListUnsorted(v: unknown): number[] {
  return asArray(v).filter((x): x is number => typeof x === 'number');
}

function indexOrEnd(order: readonly number[], id: number): number {
  const index = order.indexOf(id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function byIdGoal(list: GoalPreset[]): GoalPreset[] {
  return list.sort((a, b) => a.goal.itemId - b.goal.itemId);
}
