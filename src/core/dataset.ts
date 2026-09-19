/**
 * Shape of the compiled dataset served from public/data/ (DATA_SOURCES.md §6).
 * Format 1 (M2-5): every criterion is stored raw and as a compiled Requirement, so the browser
 * has nothing to parse. Format 0 (M1-4) stored the syntactic AST instead.
 */
import type { ParseError } from './criteria';
import type {
  AchievementId,
  DungeonId,
  ItemId,
  JobId,
  MonsterId,
  NpcId,
  Objective,
  QuestId,
  Requirement,
  Reward,
} from './types';

export const DATASET_FORMAT = 1;

export interface CompiledCriterion {
  raw: string;
  /** `unknown` when the string does not parse; `error` then says where. */
  req: Requirement;
  error?: ParseError;
}

/** Manual override attached to a node (SPEC §7). Requirements are interpreted in M2. */
export interface NodeOverride {
  addRequires?: unknown[];
  removeRequires?: string[];
  orderHint?: number;
  flags?: { avoidable?: boolean; timeGated?: boolean; note?: string };
  reason: string;
  source: string;
}

/** Rewards of a step for a band of character levels (-1 = unbounded). */
export interface RewardBand {
  levelMin: number;
  levelMax: number;
  reward: Reward;
}

export interface CompiledStep {
  id: number;
  name: string;
  optimalLevel: number | null;
  objectives: Objective[];
  rewardBands: RewardBand[];
}

export interface CompiledQuest {
  id: QuestId;
  name: string;
  categoryId: number | null;
  levelMin: number;
  levelMax: number;
  isDungeonQuest: boolean;
  isPartyQuest: boolean | null;
  isEvent: boolean | null;
  repeatType: number | null;
  repeatLimit: number | null;
  start: CompiledCriterion;
  startPositions: { mapId: number | null; npcId: NpcId | null }[];
  steps: CompiledStep[];
  /** Per item, the largest quantity over the level bands, summed over the steps. */
  rewards: Reward;
  /** DofusDB's precomputed aggregate; upper bound (includes every `|` branch). Test oracle only. */
  dbNeed: DbNeed | null;
  override?: NodeOverride;
}

export interface DbNeed {
  items: [ItemId, number][];
  quests: QuestId[];
  achievements: AchievementId[];
}

export interface CompiledAchievement {
  id: AchievementId;
  name: string;
  description: string;
  categoryId: number;
  points: number | null;
  level: number | null;
  order: number | null;
  accountLinked: boolean | null;
  objectives: { id: number; name: string; order: number | null; criterion: CompiledCriterion }[];
  /** Objective ids listed by the game data but absent upstream. */
  missingObjectiveIds: number[];
  rewards: Reward;
  dbNeed: DbNeed | null;
  override?: NodeOverride;
}

export interface CompiledItem {
  id: ItemId;
  name: string;
  typeId: number;
  level: number | null;
  iconId: number | null;
  /** Item of the "quest item" super type: hidden by default in the UI. */
  isQuestItem: boolean;
  criterion: CompiledCriterion | null;
  dropMonsterIds: MonsterId[];
  recipe: { jobId: JobId | null; ingredients: [ItemId, number][] } | null;
  questsThatReward: QuestId[];
  achievementsThatReward: AchievementId[];
}

export interface CompiledMonster {
  id: MonsterId;
  name: string;
  isBoss: boolean;
  isMiniBoss: boolean;
  /** Drops restricted to the items of the dataset: [itemId, % for grades 1 to 5]. */
  drops: [ItemId, number[]][];
}

export interface CompiledDungeon {
  id: DungeonId;
  name: string;
  level: number | null;
  minLevel: number | null;
  monsterIds: MonsterId[];
  bossIds: MonsterId[];
  requiredItems: [ItemId, number][];
}

export interface NamedRef {
  id: number;
  name: string;
}

export interface CompiledRefs {
  questCategories: (NamedRef & { order: number | null })[];
  achievementCategories: (NamedRef & { parentId: number | null; order: number | null })[];
  jobs: NamedRef[];
  breeds: NamedRef[];
  alignmentSides: NamedRef[];
  itemTypes: (NamedRef & { superTypeId: number | null })[];
  itemSuperTypes: NamedRef[];
  objectiveTypes: NamedRef[];
  npcs: NamedRef[];
  subareas: NamedRef[];
}

export interface GoalPreset {
  goal: { t: 'item'; itemId: ItemId };
  name: string;
  level: number | null;
  sources: { quests: QuestId[]; achievements: AchievementId[] };
}

export interface DatasetManifest {
  format: number;
  gameVersion: string;
  lang: string;
  builtAt: string;
  attribution: string;
  files: { file: string; bytes: number; sha256: string }[];
}

export interface CompiledDataset {
  quests: CompiledQuest[];
  achievements: CompiledAchievement[];
  items: CompiledItem[];
  monsters: CompiledMonster[];
  dungeons: CompiledDungeon[];
  refs: CompiledRefs;
  goals: GoalPreset[];
}
