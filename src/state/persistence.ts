/**
 * Storage, migrations, export / import, undo (SPEC §8).
 * The store is an interface so that localStorage can later give way to IndexedDB or a remote
 * sync without touching the rest. Nothing here touches `window`: storage and timers are injected.
 */
import { err, ok, type Result } from '../core/result';
import type { Character } from '../core/types';
import { SCHEMA_VERSION, STORAGE_KEY, emptyState, type AppState } from './types';
import { parseAppState } from './validate';

// ---------- Migrations: one pure function per schema jump ----------

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] upgrades a state from version n to n + 1. Empty while the schema is at version 1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export function migrate(value: unknown): Result<AppState, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return err('état : objet attendu');
  let current = value as Record<string, unknown>;
  for (let guard = 0; guard < 100; guard += 1) {
    const version = current.schemaVersion;
    if (version === SCHEMA_VERSION) return parseAppState(current);
    if (typeof version !== 'number' || version > SCHEMA_VERSION) {
      return err(`schemaVersion ${JSON.stringify(version)} plus récent que cette version du site`);
    }
    const step = MIGRATIONS[version];
    if (!step) return err(`aucune migration depuis la version ${version}`);
    current = step(current);
  }
  return err('migrations : boucle détectée');
}

// ---------- Store ----------

export type LoadResult =
  | { t: 'empty' }
  | { t: 'ok'; state: AppState }
  /** Unreadable: the raw text is handed back for a rescue export, and nothing gets overwritten. */
  | { t: 'corrupt'; raw: string; reason: string };

export interface ProgressStore {
  load(): LoadResult;
  save(state: AppState): void;
  clear(): void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function decodeState(raw: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { t: 'corrupt', raw, reason: 'JSON illisible' };
  }
  const migrated = migrate(parsed);
  return migrated.ok
    ? { t: 'ok', state: migrated.value }
    : { t: 'corrupt', raw, reason: migrated.error };
}

export function createStorageStore(storage: StorageLike, key: string = STORAGE_KEY): ProgressStore {
  return {
    load() {
      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        return { t: 'empty' }; // storage blocked (private mode): run in memory
      }
      return raw === null ? { t: 'empty' } : decodeState(raw);
    },
    save(state) {
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        // quota or blocked storage: the session keeps working in memory
      }
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        // nothing to clear
      }
    },
  };
}

export function createMemoryStore(
  initial: string | null = null,
): ProgressStore & { raw(): string | null } {
  let content = initial;
  return {
    load: () => (content === null ? { t: 'empty' } : decodeState(content)),
    save: (state) => {
      content = JSON.stringify(state);
    },
    clear: () => {
      content = null;
    },
    raw: () => content,
  };
}

/** Deferred write: many ticks in a row cost one write. `flush` is for page hide. */
export function createDebouncedSaver(
  store: ProgressStore,
  timers: { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void },
  delayMs = 300,
): { schedule(state: AppState): void; flush(): void } {
  let pending: AppState | null = null;
  let handle: unknown = null;
  const flush = (): void => {
    if (handle !== null) timers.clear(handle);
    handle = null;
    if (pending) store.save(pending);
    pending = null;
  };
  return {
    schedule(state) {
      pending = state;
      if (handle !== null) timers.clear(handle);
      handle = timers.set(flush, delayMs);
    },
    flush,
  };
}

// ---------- Export / import ----------

interface ExportFile {
  app: 'roadbook';
  exportedAt: string;
  state: AppState;
}

export function exportState(state: AppState, exportedAt: string): string {
  const file: ExportFile = { app: 'roadbook', exportedAt, state };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export interface ImportSummary {
  added: number;
  replaced: number;
  kept: number;
}

/** Merge by character: the most recent `updatedAt` wins; characters absent from the file are kept. */
export function importState(
  current: AppState,
  json: string,
): Result<{ state: AppState; summary: ImportSummary }, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return err('fichier : JSON illisible');
  }
  const payload =
    parsed !== null && typeof parsed === 'object' && 'state' in parsed
      ? (parsed as { state: unknown }).state
      : parsed;
  const incoming = migrate(payload);
  if (!incoming.ok) return incoming;

  const summary: ImportSummary = { added: 0, replaced: 0, kept: 0 };
  const byId = new Map<string, Character>(current.characters.map((c) => [c.id, c]));
  for (const character of incoming.value.characters) {
    const existing = byId.get(character.id);
    if (!existing) {
      byId.set(character.id, character);
      summary.added += 1;
    } else if (character.updatedAt > existing.updatedAt) {
      byId.set(character.id, character);
      summary.replaced += 1;
    } else {
      summary.kept += 1;
    }
  }
  const characters = [...byId.values()];
  const activeCharacterId =
    current.activeCharacterId ?? incoming.value.activeCharacterId ?? characters[0]?.id ?? null;
  return ok({
    state: {
      ...current,
      lastDatasetVersion: current.lastDatasetVersion || incoming.value.lastDatasetVersion,
      characters,
      activeCharacterId,
    },
    summary,
  });
}

// ---------- Undo: one level, on the last progression change ----------

export interface History {
  present: AppState;
  previous: AppState | null;
}

export function initialHistory(state: AppState = emptyState()): History {
  return { present: state, previous: null };
}

/** `undoable` is true for progression changes (ticks, inventory), false for navigation-like changes. */
export function commit(history: History, next: AppState, undoable: boolean): History {
  if (next === history.present) return history;
  return { present: next, previous: undoable ? history.present : null };
}

export function undo(history: History): History {
  return history.previous ? { present: history.previous, previous: null } : history;
}
