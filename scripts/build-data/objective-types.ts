/**
 * Quest objective types: where the referenced ids sit in `parameters` (parameter0…parameter2).
 * Built from the real list observed in M1-1 (docs/DATA_NOTES.md §4). A type absent from this
 * table carries no known reference and is compiled as `other` with its text.
 */
import type { ObjectiveKind } from '../../src/core/types';

export type ParamRole = 'npc' | 'item' | 'monster' | 'subarea' | 'map' | 'qty';

export const OBJECTIVE_PARAM_ROLES: Readonly<Record<number, readonly (ParamRole | null)[]>> = {
  1: ['npc'], // Aller voir #1
  2: ['npc', 'item', 'qty'], // Montrer à #1 : #3 #2
  3: ['npc', 'item', 'qty'], // Ramener à #1 : x#3 #2
  4: ['map'], // Découvrir la carte : #1
  5: ['subarea'], // Découvrir la zone #1
  6: ['monster', 'qty'], // Vaincre x#2 #1 en un seul combat
  9: ['npc'], // Retourner voir #1
  12: ['npc', 'monster', 'qty'], // Rapporter #3 âme de #2 à #1
  14: ['monster', 'qty'], // Vaincre x#2 #1
  16: ['monster', 'qty', 'map'], // Vaincre x#2 #1 sur la carte #3 en un seul combat
  17: ['item', 'qty'], // Fabriquer #2 #1 et fermer l'interface
};

/** Objective type → compiled `Objective` variant (SPEC §5, extended in DATA_NOTES §13). Others → 'other'. */
export const OBJECTIVE_KINDS: Readonly<Record<number, ObjectiveKind>> = {
  1: 'talkTo',
  2: 'showItem',
  3: 'bringItem',
  4: 'goTo',
  5: 'goTo',
  6: 'killMonster',
  9: 'talkTo',
  12: 'bringSoul',
  14: 'killMonster',
  16: 'killMonster',
  17: 'craft',
};

/** Types whose kill must happen in a single fight. */
export const SINGLE_FIGHT_TYPES: ReadonlySet<number> = new Set([6, 16]);
