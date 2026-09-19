import { describe, expect, it } from 'vitest';
import {
  activeCharacter,
  addGoal,
  createCharacter,
  deleteCharacter,
  removeGoal,
  setActiveCharacter,
  setChoice,
  setNodeDone,
  setOwnedQuantity,
  updateCharacter,
} from './actions';
import {
  commit,
  createDebouncedSaver,
  createMemoryStore,
  createStorageStore,
  decodeState,
  exportState,
  importState,
  initialHistory,
  migrate,
  undo,
} from './persistence';
import { emptyState, type AppState, type StateDeps } from './types';
import { parseAppState } from './validate';

/** Deterministic deps: a counter for ids, a manual clock. All ids and names are FAKE. */
function makeDeps(start = 0, prefix = 'FAKE'): StateDeps & { tick(): void } {
  let n = 0;
  let time = start;
  return {
    newId: () => `${prefix}-${(n += 1)}`,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, time)).toISOString(),
    tick: () => {
      time += 1;
    },
  };
}

function seeded(): { state: AppState; deps: ReturnType<typeof makeDeps>; id: string } {
  const deps = makeDeps();
  const state = createCharacter(
    emptyState(),
    { name: '  FAKE Iop  ', level: 250, alignment: 1 },
    deps,
  );
  return { state, deps, id: state.characters[0]?.id ?? '' };
}

describe('actions', () => {
  it('creates a character, trims the name, clamps the level and makes it active', () => {
    const { state } = seeded();
    expect(state.characters).toHaveLength(1);
    expect(activeCharacter(state)).toMatchObject({
      id: 'FAKE-1',
      name: 'FAKE Iop',
      level: 200,
      alignment: 1,
      breedId: null,
    });
  });

  it('updates only what is given and stamps updatedAt', () => {
    const { state, deps, id } = seeded();
    deps.tick();
    const next = updateCharacter(state, id, { level: null, serverName: ' FAKE serveur ' }, deps);
    expect(activeCharacter(next)).toMatchObject({
      name: 'FAKE Iop',
      level: null,
      serverName: 'FAKE serveur',
      alignment: 1,
    });
    expect(activeCharacter(next)?.updatedAt).not.toBe(activeCharacter(state)?.updatedAt);
    expect(updateCharacter(state, 'FAKE-unknown', { name: 'x' }, deps)).toBe(state);
  });

  it('ticks and unticks nodes explicitly, sorted and without duplicates', () => {
    const { state, deps, id } = seeded();
    let next = setNodeDone(state, id, 'q:9000002', true, deps);
    next = setNodeDone(next, id, 'q:9000001', true, deps);
    next = setNodeDone(next, id, 'a:9000201', true, deps);
    expect(setNodeDone(next, id, 'q:9000001', true, deps)).toBe(next);
    expect(activeCharacter(next)).toMatchObject({
      doneQuests: [9000001, 9000002],
      doneAchievements: [9000201],
    });
    next = setNodeDone(next, id, 'q:9000002', false, deps);
    expect(activeCharacter(next)?.doneQuests).toEqual([9000001]);
  });

  it('stores owned quantities, removing zero and rejecting negatives', () => {
    const { state, deps, id } = seeded();
    let next = setOwnedQuantity(state, id, 9100001, 4.6, deps);
    expect(activeCharacter(next)?.inventory).toEqual({ 9100001: 5 });
    next = setOwnedQuantity(next, id, 9100001, -3, deps);
    expect(activeCharacter(next)?.inventory).toEqual({});
  });

  it('stores and forgets a choice, adds and removes goals without duplicates', () => {
    const { state, deps, id } = seeded();
    let next = setChoice(state, id, 'q:9000003#0.1', 2, deps);
    expect(activeCharacter(next)?.choices).toEqual({ 'q:9000003#0.1': 2 });
    next = setChoice(next, id, 'q:9000003#0.1', null, deps);
    expect(activeCharacter(next)?.choices).toEqual({});

    next = addGoal(next, id, { t: 'item', itemId: 9100001 }, deps);
    expect(addGoal(next, id, { t: 'item', itemId: 9100001 }, deps)).toBe(next);
    next = addGoal(next, id, { t: 'quest', id: 9000001 }, deps);
    next = removeGoal(next, id, { t: 'item', itemId: 9100001 }, deps);
    expect(activeCharacter(next)?.goals).toEqual([{ t: 'quest', id: 9000001 }]);
  });

  it('deleting the active character activates another one; switching is explicit', () => {
    const { state, deps } = seeded();
    const two = createCharacter(state, { name: 'FAKE Cra' }, deps);
    expect(two.activeCharacterId).toBe('FAKE-2');
    expect(setActiveCharacter(two, 'FAKE-1').activeCharacterId).toBe('FAKE-1');
    expect(setActiveCharacter(two, 'FAKE-unknown')).toBe(two);
    const one = deleteCharacter(two, 'FAKE-2');
    expect(one.activeCharacterId).toBe('FAKE-1');
    expect(deleteCharacter(deleteCharacter(one, 'FAKE-1'), 'FAKE-1').activeCharacterId).toBeNull();
  });
});

describe('validation and migrations', () => {
  it('accepts its own output and keeps unknown node ids', () => {
    const { state, deps, id } = seeded();
    const withGhost = setNodeDone(state, id, 'q:9099999', true, deps);
    const parsed = parseAppState(JSON.parse(JSON.stringify(withGhost)));
    expect(parsed).toEqual({ ok: true, value: withGhost });
  });

  it('drops malformed fragments but refuses a broken structure', () => {
    const repaired = parseAppState({
      schemaVersion: 1,
      characters: [
        {
          id: 'FAKE-1',
          name: 'FAKE',
          doneQuests: [1.5, 'x', 9000001, 9000001],
          inventory: { 9100001: -2, 9100002: 3 },
          goals: [{ t: 'nope' }, { t: 'quest', id: 9000001 }],
          alignment: 7,
        },
      ],
      activeCharacterId: 'FAKE-ghost',
    });
    expect(repaired.ok && repaired.value.characters[0]).toMatchObject({
      doneQuests: [9000001],
      inventory: { 9100002: 3 },
      goals: [{ t: 'quest', id: 9000001 }],
      alignment: null,
    });
    expect(repaired.ok && repaired.value.activeCharacterId).toBe('FAKE-1');

    expect(parseAppState(null).ok).toBe(false);
    expect(parseAppState({ schemaVersion: 1, characters: 'x' }).ok).toBe(false);
    expect(
      parseAppState({
        schemaVersion: 1,
        characters: [
          { id: 'a', name: 'FAKE' },
          { id: 'a', name: 'FAKE' },
        ],
      }).ok,
    ).toBe(false);
  });

  it('refuses a state written by a newer or unknown schema', () => {
    expect(migrate({ schemaVersion: 2, characters: [] })).toEqual({
      ok: false,
      error: 'schemaVersion 2 plus récent que cette version du site',
    });
    expect(migrate({ schemaVersion: 0, characters: [] })).toEqual({
      ok: false,
      error: 'aucune migration depuis la version 0',
    });
    expect(migrate([]).ok).toBe(false);
  });
});

describe('stores', () => {
  it('round-trips through the memory store', () => {
    const { state } = seeded();
    const store = createMemoryStore();
    expect(store.load()).toEqual({ t: 'empty' });
    store.save(state);
    expect(store.load()).toEqual({ t: 'ok', state });
    store.clear();
    expect(store.load()).toEqual({ t: 'empty' });
  });

  it('never loses an unreadable state: it is handed back raw', () => {
    expect(createMemoryStore('{broken').load()).toEqual({
      t: 'corrupt',
      raw: '{broken',
      reason: 'JSON illisible',
    });
    const result = decodeState('{"schemaVersion":1,"characters":"x"}');
    expect(result.t).toBe('corrupt');
  });

  it('survives a blocked storage', () => {
    const blocked = createStorageStore({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(blocked.load()).toEqual({ t: 'empty' });
    expect(() => blocked.save(emptyState())).not.toThrow();
    expect(() => blocked.clear()).not.toThrow();
  });

  it('writes under the versioned key', () => {
    const map = new Map<string, string>();
    const store = createStorageStore({
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    });
    store.save(emptyState());
    expect([...map.keys()]).toEqual(['roadbook:state:v1']);
  });

  it('debounces writes and flushes on demand', () => {
    const store = createMemoryStore();
    const scheduled: (() => void)[] = [];
    const saver = createDebouncedSaver(store, {
      set: (fn) => scheduled.push(fn),
      clear: () => undefined,
    });
    const { state, deps, id } = seeded();
    saver.schedule(state);
    saver.schedule(setNodeDone(state, id, 'q:9000001', true, deps));
    expect(store.raw()).toBeNull();
    saver.flush();
    expect(store.load()).toMatchObject({
      t: 'ok',
      state: { characters: [{ doneQuests: [9000001] }] },
    });
  });
});

describe('export and import', () => {
  it('importing an export into an empty state gives the same state', () => {
    const { state } = seeded();
    const imported = importState(emptyState(), exportState(state, '2026-01-02T00:00:00.000Z'));
    expect(imported.ok && imported.value.state).toEqual(state);
    expect(imported.ok && imported.value.summary).toEqual({ added: 1, replaced: 0, kept: 0 });
  });

  it('merges by character: the most recent wins, others are kept', () => {
    const { state, deps, id } = seeded();
    const older = exportState(state, 'x');
    deps.tick();
    const newer = setNodeDone(state, id, 'q:9000001', true, deps);

    const keepNewer = importState(newer, older);
    expect(keepNewer.ok && keepNewer.value.state.characters[0]?.doneQuests).toEqual([9000001]);
    expect(keepNewer.ok && keepNewer.value.summary).toEqual({ added: 0, replaced: 0, kept: 1 });

    const takeNewer = importState(state, exportState(newer, 'x'));
    expect(takeNewer.ok && takeNewer.value.state.characters[0]?.doneQuests).toEqual([9000001]);
    expect(takeNewer.ok && takeNewer.value.summary).toEqual({ added: 0, replaced: 1, kept: 0 });

    const other = createCharacter(emptyState(), { name: 'FAKE Cra' }, makeDeps(100, 'FAKE-other'));
    const both = importState(other, older);
    expect(both.ok && both.value.state.characters.map((c) => c.name)).toEqual([
      'FAKE Cra',
      'FAKE Iop',
    ]);
  });

  it('rejects an unreadable file without touching the current state', () => {
    expect(importState(emptyState(), 'not json').ok).toBe(false);
    expect(importState(emptyState(), '{"state":{"schemaVersion":9}}').ok).toBe(false);
  });
});

describe('undo', () => {
  it('restores the state before the last progression change, one level only', () => {
    const { state, deps, id } = seeded();
    let history = initialHistory(state);
    history = commit(history, setNodeDone(history.present, id, 'q:9000001', true, deps), true);
    history = commit(history, setNodeDone(history.present, id, 'q:9000002', true, deps), true);
    history = undo(history);
    expect(activeCharacter(history.present)?.doneQuests).toEqual([9000001]);
    expect(undo(history)).toBe(history);
  });

  it('a non-undoable change clears the undo slot; an unchanged state changes nothing', () => {
    const { state, deps, id } = seeded();
    let history = commit(
      initialHistory(state),
      setNodeDone(state, id, 'q:9000001', true, deps),
      true,
    );
    expect(commit(history, history.present, true)).toBe(history);
    history = commit(history, createCharacter(history.present, { name: 'FAKE Cra' }, deps), false);
    expect(history.previous).toBeNull();
  });
});
