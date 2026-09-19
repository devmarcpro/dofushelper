/**
 * Pure state transitions. Each one returns a new state (or the same reference when nothing
 * changes) and stamps the touched character with `updatedAt`, used by the import merge.
 */
import type { AlignmentSide, Character, Goal, NodeKey } from '../core/types';
import type { AppState, StateDeps } from './types';

export interface CharacterInput {
  name: string;
  breedId?: number | null;
  level?: number | null;
  alignment?: AlignmentSide | null;
  serverName?: string | null;
  jobs?: Record<number, number>;
}

const clampLevel = (level: number | null | undefined): number | null =>
  level === null || level === undefined || !Number.isFinite(level)
    ? null
    : Math.min(200, Math.max(1, Math.round(level)));

export function createCharacter(state: AppState, input: CharacterInput, deps: StateDeps): AppState {
  const character: Character = {
    id: deps.newId(),
    name: input.name.trim(),
    breedId: input.breedId ?? null,
    level: clampLevel(input.level),
    alignment: input.alignment ?? null,
    jobs: { ...(input.jobs ?? {}) },
    serverName: input.serverName?.trim() || null,
    doneQuests: [],
    doneAchievements: [],
    inventory: {},
    goals: [],
    choices: {},
    updatedAt: deps.now(),
  };
  return {
    ...state,
    characters: [...state.characters, character],
    activeCharacterId: character.id,
  };
}

function updateOne(
  state: AppState,
  id: string,
  deps: StateDeps,
  change: (c: Character) => Character,
): AppState {
  let touched = false;
  const characters = state.characters.map((c) => {
    if (c.id !== id) return c;
    const next = change(c);
    if (next === c) return c;
    touched = true;
    return { ...next, updatedAt: deps.now() };
  });
  return touched ? { ...state, characters } : state;
}

export function updateCharacter(
  state: AppState,
  id: string,
  input: Partial<CharacterInput>,
  deps: StateDeps,
): AppState {
  return updateOne(state, id, deps, (c) => ({
    ...c,
    name: input.name !== undefined ? input.name.trim() : c.name,
    breedId: input.breedId !== undefined ? input.breedId : c.breedId,
    level: input.level !== undefined ? clampLevel(input.level) : c.level,
    alignment: input.alignment !== undefined ? input.alignment : c.alignment,
    serverName: input.serverName !== undefined ? input.serverName?.trim() || null : c.serverName,
    jobs: input.jobs !== undefined ? { ...input.jobs } : c.jobs,
  }));
}

export function deleteCharacter(state: AppState, id: string): AppState {
  if (!state.characters.some((c) => c.id === id)) return state;
  const characters = state.characters.filter((c) => c.id !== id);
  const activeCharacterId =
    state.activeCharacterId === id ? (characters[0]?.id ?? null) : state.activeCharacterId;
  return { ...state, characters, activeCharacterId };
}

export function setActiveCharacter(state: AppState, id: string): AppState {
  return state.characters.some((c) => c.id === id) && state.activeCharacterId !== id
    ? { ...state, activeCharacterId: id }
    : state;
}

/** Ticks or unticks a node explicitly. Implied nodes are never stored (golden rule 6). */
export function setNodeDone(
  state: AppState,
  id: string,
  key: NodeKey,
  done: boolean,
  deps: StateDeps,
): AppState {
  const nodeId = Number(key.slice(2));
  const field = key.startsWith('q:') ? 'doneQuests' : 'doneAchievements';
  return updateOne(state, id, deps, (c) => {
    const has = c[field].includes(nodeId);
    if (has === done) return c;
    const list = done
      ? [...c[field], nodeId].sort((a, b) => a - b)
      : c[field].filter((x) => x !== nodeId);
    return { ...c, [field]: list };
  });
}

export function setOwnedQuantity(
  state: AppState,
  id: string,
  itemId: number,
  qty: number,
  deps: StateDeps,
): AppState {
  const value = Number.isFinite(qty) ? Math.max(0, Math.round(qty)) : 0;
  return updateOne(state, id, deps, (c) => {
    if ((c.inventory[itemId] ?? 0) === value) return c;
    const inventory = { ...c.inventory };
    if (value === 0) delete inventory[itemId];
    else inventory[itemId] = value;
    return { ...c, inventory };
  });
}

/** `branch === null` forgets the choice: the engine falls back to profile, then default. */
export function setChoice(
  state: AppState,
  id: string,
  choiceId: string,
  branch: number | null,
  deps: StateDeps,
): AppState {
  return updateOne(state, id, deps, (c) => {
    if ((c.choices[choiceId] ?? null) === branch) return c;
    const choices = { ...c.choices };
    if (branch === null) delete choices[choiceId];
    else choices[choiceId] = branch;
    return { ...c, choices };
  });
}

export const sameGoal = (a: Goal, b: Goal): boolean =>
  a.t === b.t &&
  (a.t === 'item' ? a.itemId === (b as typeof a).itemId : a.id === (b as typeof a).id);

export function addGoal(state: AppState, id: string, goal: Goal, deps: StateDeps): AppState {
  return updateOne(state, id, deps, (c) =>
    c.goals.some((g) => sameGoal(g, goal)) ? c : { ...c, goals: [...c.goals, goal] },
  );
}

export function removeGoal(state: AppState, id: string, goal: Goal, deps: StateDeps): AppState {
  return updateOne(state, id, deps, (c) =>
    c.goals.some((g) => sameGoal(g, goal))
      ? { ...c, goals: c.goals.filter((g) => !sameGoal(g, goal)) }
      : c,
  );
}

export function setDatasetVersion(state: AppState, version: string): AppState {
  return state.lastDatasetVersion === version ? state : { ...state, lastDatasetVersion: version };
}

export function activeCharacter(state: AppState): Character | null {
  return state.characters.find((c) => c.id === state.activeCharacterId) ?? null;
}
