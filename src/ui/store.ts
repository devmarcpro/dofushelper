/**
 * Application store: signals over the pure modules. Nothing derived is stored: the engine
 * recomputes plans from the character's explicit facts on every change (golden rule 6).
 * This is the only place of the UI that touches localStorage, the clock and the URL hash.
 */
import { computed, signal } from '@preact/signals';
import { createEngine, type Engine } from '../core/engine';
import { loadDataset, type DatasetError, type LoadedDataset } from '../data/load';
import { activeCharacter, setDatasetVersion } from '../state/actions';
import {
  commit,
  createDebouncedSaver,
  createStorageStore,
  exportState,
  initialHistory,
  undo,
  type History,
  type ProgressStore,
} from '../state/persistence';
import { emptyState, type AppState, type StateDeps } from '../state/types';
import { createLabels, type Labels } from './labels';
import { parseRoute, type Route } from './router';
import { buildSearchIndex, type SearchEntry } from './search';

export const deps: StateDeps = {
  now: () => new Date().toISOString(),
  newId: () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
};

function openStore(): ProgressStore {
  try {
    return createStorageStore(window.localStorage);
  } catch {
    // Storage denied: keep the session alive in memory.
    const memory = new Map<string, string>();
    return createStorageStore({
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    });
  }
}

const progressStore = openStore();
const loaded = progressStore.load();

/** Set when the saved state is unreadable. While set, NOTHING is written: the data is never overwritten. */
export const corrupt = signal<{ raw: string; reason: string } | null>(
  loaded.t === 'corrupt' ? { raw: loaded.raw, reason: loaded.reason } : null,
);

export const history = signal<History>(
  initialHistory(loaded.t === 'ok' ? loaded.state : emptyState()),
);
export const appState = computed<AppState>(() => history.value.present);
export const character = computed(() => activeCharacter(appState.value));
export const canUndo = computed(() => history.value.previous !== null);

const saver = createDebouncedSaver(progressStore, {
  set: (fn, ms) => window.setTimeout(fn, ms),
  clear: (handle) => window.clearTimeout(handle as number),
});

function persist(): void {
  if (corrupt.value === null) saver.schedule(history.value.present);
}

/** Applies a pure state change. `undoable` marks progression changes (ticks, inventory). */
export function dispatch(
  change: (state: AppState, deps: StateDeps) => AppState,
  undoable = false,
): void {
  history.value = commit(history.value, change(appState.value, deps), undoable);
  persist();
}

export function undoLast(): void {
  history.value = undo(history.value);
  persist();
}

/** The player explicitly gives up the unreadable state (after having been offered the raw export). */
export function resetCorruptState(): void {
  corrupt.value = null;
  progressStore.clear();
  history.value = initialHistory(emptyState());
}

export function exportJson(): string {
  return exportState(appState.value, deps.now());
}

/** Hands a text file to the browser without any network request. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------- Dataset ----------

export type DataState =
  { t: 'loading' } | { t: 'error'; error: DatasetError } | ({ t: 'ready' } & LoadedDataset);

export const data = signal<DataState>({ t: 'loading' });
export const engine = computed<Engine | null>(() =>
  data.value.t === 'ready' ? createEngine(data.value.dataset) : null,
);
export const labels = computed<Labels | null>(() =>
  data.value.t === 'ready' ? createLabels(data.value.dataset) : null,
);

export const searchIndex = computed<SearchEntry[]>(() =>
  data.value.t === 'ready' ? buildSearchIndex(data.value.dataset) : [],
);

export async function loadData(): Promise<void> {
  data.value = { t: 'loading' };
  const result = await loadDataset();
  if (!result.ok) {
    data.value = { t: 'error', error: result.error };
    return;
  }
  data.value = { t: 'ready', ...result.value };
  dispatch((state) => setDatasetVersion(state, result.value.manifest.gameVersion));
}

// ---------- Route ----------

export const route = signal<Route>(parseRoute(window.location.hash));

export function startApp(): void {
  window.addEventListener('hashchange', () => {
    route.value = parseRoute(window.location.hash);
    window.scrollTo(0, 0);
    // Keyboard and screen-reader users land on the new page content, not back on the header.
    document.getElementById('contenu')?.focus({ preventScroll: true });
  });
  // Write pending changes before the page goes away.
  window.addEventListener('pagehide', () => saver.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saver.flush();
  });
  void loadData();
}

// ---------- Toast (one at a time) ----------

export interface Toast {
  message: string;
  undoable: boolean;
}

export const toast = signal<Toast | null>(null);
