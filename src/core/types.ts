/**
 * Domain types (SPEC §5). Names follow the spec; fields are extended where the real data
 * brought more than expected (docs/DATA_NOTES.md §4, §5 and §13).
 * The Requirement / Plan types arrive with the engine (M2).
 */

export type QuestId = number;
export type AchievementId = number;
export type ItemId = number;
export type MonsterId = number;
export type DungeonId = number;
export type JobId = number;
export type BreedId = number;
export type NpcId = number;

/** What a quest step asks for. `text` is the game's own wording, with {npc,id}-style tags. */
export type Objective = { id: number; text: string } & (
  | { t: 'bringItem'; itemId: ItemId; qty: number; npcId: NpcId | null } // consumed
  | { t: 'showItem'; itemId: ItemId; qty: number; npcId: NpcId | null } // not consumed
  | { t: 'useItem'; itemId: ItemId; qty: number }
  | {
      t: 'killMonster';
      monsterId: MonsterId;
      qty: number;
      singleFight: boolean;
      mapId: number | null;
      dungeonIds: DungeonId[];
    }
  | {
      t: 'bringSoul';
      monsterId: MonsterId;
      qty: number;
      npcId: NpcId | null;
      dungeonIds: DungeonId[];
    }
  | { t: 'craft'; itemId: ItemId; qty: number; ingredients: [ItemId, number][] }
  | { t: 'talkTo'; npcId: NpcId }
  | { t: 'goTo'; mapId: number | null; subareaId: number | null }
  | { t: 'other'; typeId: number } // unmapped type: the text is rendered as is
);

export type ObjectiveKind = Objective['t'];

export interface Reward {
  items: { itemId: ItemId; qty: number }[];
  titles: number[];
  ornaments: number[];
  emotes: number[];
  spells: number[];
}

/** 1 Bonta, 2 Brâkmar; 0 is the neutral side (the game writes it "Ps!1&Ps!2" in criteria). */
export type AlignmentSide = 0 | 1 | 2;

/** Boolean expression derived from a game criterion (SPEC §5). */
export type Requirement =
  | { t: 'all'; of: Requirement[] } // `all` of nothing is "always true" (the game's BT=1)
  | { t: 'any'; of: Requirement[] }
  | { t: 'not'; of: Requirement }
  | { t: 'questDone'; id: QuestId }
  | { t: 'achievementDone'; id: AchievementId }
  | { t: 'level'; min: number } // "PL>109" → min = 110
  | { t: 'jobLevel'; jobId: JobId; min: number }
  | { t: 'alignment'; side: AlignmentSide }
  | { t: 'breed'; id: BreedId }
  | { t: 'hasItem'; itemId: ItemId; qty: number }
  | { t: 'context'; key: string; raw: string } // true in game, but a plan cannot drive it
  | { t: 'unknown'; raw: string }; // not interpreted: never blocking, always displayable

export type NodeKey = `q:${QuestId}` | `a:${AchievementId}`;

export type Goal =
  | { t: 'item'; itemId: ItemId }
  | { t: 'achievement'; id: AchievementId }
  | { t: 'quest'; id: QuestId };

/**
 * What the player entered (SPEC §8). Only explicit facts: statuses, implied nodes and
 * aggregates are always recomputed (golden rule 6). `null` means "not filled in", which is
 * never blocking.
 */
export interface Character {
  id: string;
  name: string;
  breedId: BreedId | null;
  level: number | null;
  alignment: AlignmentSide | null;
  jobs: Record<JobId, number>;
  serverName: string | null;
  doneQuests: QuestId[];
  doneAchievements: AchievementId[];
  inventory: Record<ItemId, number>;
  goals: Goal[];
  choices: Record<string, number>;
  updatedAt: string;
}
