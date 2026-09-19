/**
 * Quest objective types: where the referenced ids sit in `parameters` (parameter0…parameter2).
 * Built from the real list observed in M1-1 (docs/DATA_NOTES.md §4). A type absent from this
 * table carries no known reference and is compiled as `other` with its text.
 */
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
