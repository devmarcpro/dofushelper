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
