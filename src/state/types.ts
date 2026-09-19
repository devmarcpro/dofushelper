/** Persisted application state (SPEC §8). Only facts entered by the player: nothing derived. */
import type { Character } from '../core/types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'roadbook:state:v1';

export interface AppStateV1 {
  schemaVersion: 1;
  /** Game version of the last dataset loaded. */
  lastDatasetVersion: string;
  activeCharacterId: string | null;
  characters: Character[];
}

export type AppState = AppStateV1;

export function emptyState(): AppState {
  return { schemaVersion: 1, lastDatasetVersion: '', activeCharacterId: null, characters: [] };
}

/** Everything impure is injected, so the reducers stay testable. */
export interface StateDeps {
  now: () => string; // ISO 8601
  newId: () => string;
}
