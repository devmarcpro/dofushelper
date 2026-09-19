/**
 * Application store: signals over the pure modules. Nothing derived is stored: the engine
 * recomputes plans from the character's explicit facts on every change (golden rule 6).
 * This is the only place of the UI that touches localStorage, the clock and the URL hash.
 */
import { computed, signal } from '@preact/signals';
import { createEngine, type Engine, type FullPlan } from '../core/engine';
import { computeEffectiveDone } from '../core/progress';
import type { Character, Goal } from '../core/types';
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
import { STORAGE_KEY, emptyState, type AppState, type StateDeps } from '../state/types';
import { createLabels, type Labels } from './labels';
import { goalSlug, parseRoute, type Route } from './router';
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

/**
 * Set when the saved state cannot be used as is. While set, NOTHING is written, so the stored
 * data is never overwritten. `newer` is valid data written by a more recent build of the site:
 * the answer is to reload, never to erase.
 */
export const blocked = signal<
  { t: 'corrupt'; raw: string; reason: string } | { t: 'newer'; raw: string } | null
>(
  loaded.t === 'corrupt'
    ? { t: 'corrupt', raw: loaded.raw, reason: loaded.reason }
    : loaded.t === 'newer'
      ? { t: 'newer', raw: loaded.raw }
      : null,
);

/** True once a write has failed: the browser refuses to store anything (private mode, quota). */
export const storageBlocked = signal(false);

/** True when another tab has saved a different state: this tab would overwrite it blindly. */
export const otherTabSaved = signal(false);

export const history = signal<History>(
  initialHistory(loaded.t === 'ok' ? loaded.state : emptyState()),
);
export const appState = computed<AppState>(() => history.value.present);
export const character = computed(() => activeCharacter(appState.value));
export const canUndo = computed(() => history.value.previous !== null);

const saver = createDebouncedSaver(
  {
    ...progressStore,
    save: (state) => {
      const ok = progressStore.save(state);
      storageBlocked.value = !ok;
      return ok;
    },
  },
  {
    set: (fn, ms) => window.setTimeout(fn, ms),
    clear: (handle) => window.clearTimeout(handle as number),
  },
);

function persist(): void {
  if (blocked.value === null && !otherTabSaved.value) saver.schedule(history.value.present);
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
  blocked.value = null;
  progressStore.clear();
  history.value = initialHistory(emptyState());
}

/** Takes what another tab saved, dropping what was done here since. */
export function adoptStoredState(): void {
  const again = progressStore.load();
  if (again.t === 'ok') history.value = initialHistory(again.state);
  otherTabSaved.value = false;
}

/** Keeps what this tab has, and overwrites the other tab's work on the next save. */
export function keepThisTabState(): void {
  otherTabSaved.value = false;
  persist();
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

/** A character with nothing filled in, so a plan can be shown before any character exists. */
const ANONYMOUS: Character = {
  id: '',
  name: '',
  breedId: null,
  level: null,
  alignment: null,
  jobs: {},
  serverName: null,
  doneQuests: [],
  doneAchievements: [],
  inventory: {},
  goals: [],
  choices: {},
  updatedAt: '',
};

/**
 * Resolving a plan walks the whole graph (~15 ms), and screens list many goals at once: the
 * catalog used to re-resolve every followed goal on each keystroke. The cache is rebuilt from
 * scratch whenever the dataset or the character changes, so nothing derived is ever stale.
 */
export const effectiveDone = computed(() => {
  const graph = engine.value?.graph;
  return graph ? computeEffectiveDone(graph, character.value ?? ANONYMOUS) : null;
});

export const planFor = computed(() => {
  const currentEngine = engine.value;
  const who = character.value ?? ANONYMOUS;
  const cache = new Map<string, FullPlan>();
  return (goal: Goal): FullPlan | null => {
    if (!currentEngine) return null;
    const key = goalSlug(goal);
    const known = cache.get(key);
    if (known) return known;
    const plan = currentEngine.resolve(goal, who);
    cache.set(key, plan);
    return plan;
  };
});

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

// ---------- Toast (one at a time) ----------

export interface Toast {
  message: string;
  undoable: boolean;
}

export const toast = signal<Toast | null>(null);

// ---------- Route ----------

export const route = signal<Route>(parseRoute(window.location.hash));

export function startApp(): void {
  /*
   * Another tab writing the same key would otherwise be overwritten blindly by the next save
   * here, losing everything it did. Stop writing and let the player choose which one wins.
   */
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || event.newValue === null) return;
    if (event.newValue === JSON.stringify(history.value.present)) return;
    otherTabSaved.value = true;
  });

  window.addEventListener('hashchange', () => {
    route.value = parseRoute(window.location.hash);
    // A message about what just happened does not survive a change of screen.
    toast.value = null;
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
