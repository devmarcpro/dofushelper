/** Output types of the engine (SPEC §5). Everything here is derived, never stored (golden rule 6). */
import type {
  AlignmentSide,
  BreedId,
  DungeonId,
  Goal,
  ItemId,
  JobId,
  MonsterId,
  NodeKey,
  Requirement,
} from './types';

export type NodeStatus = 'done' | 'implied' | 'available' | 'blocked';

/** `hasItem` is never a block reason (decision 2026-09-18): items are needs, listed in "À réunir". */
export type BlockReason =
  | { t: 'node'; key: NodeKey }
  | { t: 'level'; min: number }
  | { t: 'jobLevel'; jobId: JobId; min: number }
  | { t: 'alignment'; side: AlignmentSide; negated: boolean }
  | { t: 'breed'; id: BreedId; negated: boolean };

export interface PlanNode {
  key: NodeKey;
  status: NodeStatus;
  /** For an implied node: the node it was deduced from. */
  impliedBy: NodeKey | null;
  blockedBy: BlockReason[];
  /** Prerequisites kept by the plan: mandatory ones plus the chosen branches. Limited to the plan. */
  dependsOn: NodeKey[];
  unlocks: NodeKey[];
  /** Incompatible nodes ("Qf!216"): displayed, never blocking. */
  exclusions: NodeKey[];
  /** Profile leaves that apply to this node (level, job, alignment, class, item). */
  conditions: Requirement[];
  /** Raw context and unknown criteria, displayed as is. */
  context: string[];
}

export interface ChoicePoint {
  /** Deterministic: owner + position of the `any` in the owner's requirement. */
  id: string;
  owner: NodeKey | 'goal';
  branches: Requirement[];
  chosen: number;
  chosenBy: 'progress' | 'user' | 'profile' | 'default';
}

export type DataIssue =
  | { t: 'cycle'; path: NodeKey[] }
  | { t: 'missingNode'; key: NodeKey; referencedBy: NodeKey | 'goal' }
  | { t: 'unknownCriterion'; raw: string; owner: NodeKey }
  | { t: 'noSourceForItem'; itemId: ItemId };

export interface ItemNeed {
  itemId: ItemId;
  toAcquire: number;
  owned: number;
  remaining: number;
  usedBy: { key: NodeKey; qty: number; consumed: boolean }[];
  providedBy: { key: NodeKey; qty: number }[];
  isQuestItem: boolean;
}

export interface MonsterNeed {
  monsterId: MonsterId;
  qty: number;
  singleFightMax: number;
  usedBy: NodeKey[];
}

export interface DungeonNeed {
  dungeonId: DungeonId;
  usedBy: NodeKey[];
}

export interface PlanConditions {
  level: number | null;
  jobs: { jobId: JobId; min: number }[];
  alignment: AlignmentSide | null;
  breed: BreedId | null;
  context: string[];
}

export interface Plan {
  goal: Goal;
  /** Ordered: prerequisites before dependants. */
  nodes: PlanNode[];
  choicePoints: ChoicePoint[];
  progress: { done: number; total: number };
  /** 'available' nodes, in plan order. */
  nextActions: NodeKey[];
  issues: DataIssue[];
}
