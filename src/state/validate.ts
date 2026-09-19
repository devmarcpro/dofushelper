/**
 * Every read from storage or from an import file is validated (SPEC §8). Parsing is fallible
 * and returns a Result: an unreadable state is never overwritten, the caller offers a raw
 * export and a reset. Unknown fields are dropped; ids of nodes that no longer exist in the
 * dataset are KEPT (they are reported elsewhere, never deleted silently).
 */
import { err, ok, type Result } from '../core/result';
import type { AlignmentSide, Character, Goal } from '../core/types';
import { SCHEMA_VERSION, type AppState } from './types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const intOrNull = (v: unknown): number | null => (isInt(v) ? v : null);

function intList(v: unknown): number[] {
  return Array.isArray(v) ? [...new Set(v.filter(isInt))].sort((a, b) => a - b) : [];
}

function intRecord(v: unknown, min: number): Record<number, number> {
  const out: Record<number, number> = {};
  if (!isObj(v)) return out;
  for (const [key, value] of Object.entries(v)) {
    const id = Number(key);
    if (Number.isInteger(id) && isInt(value) && value >= min) out[id] = value;
  }
  return out;
}

function parseGoal(v: unknown): Goal | null {
  if (!isObj(v)) return null;
  if (v.t === 'item' && isInt(v.itemId)) return { t: 'item', itemId: v.itemId };
  if ((v.t === 'quest' || v.t === 'achievement') && isInt(v.id)) return { t: v.t, id: v.id };
  return null;
}

function parseCharacter(v: unknown, index: number): Result<Character, string> {
  if (!isObj(v)) return err(`characters[${index}] : objet attendu`);
  if (typeof v.id !== 'string' || v.id.length === 0)
    return err(`characters[${index}].id : chaîne attendue`);
  if (typeof v.name !== 'string') return err(`characters[${index}].name : chaîne attendue`);
  const alignment =
    v.alignment === 0 || v.alignment === 1 || v.alignment === 2
      ? (v.alignment as AlignmentSide)
      : null;
  const choices: Record<string, number> = {};
  if (isObj(v.choices)) {
    for (const [key, value] of Object.entries(v.choices))
      if (isInt(value) && value >= 0) choices[key] = value;
  }
  return ok({
    id: v.id,
    name: v.name,
    breedId: intOrNull(v.breedId),
    level: intOrNull(v.level),
    alignment,
    jobs: intRecord(v.jobs, 1),
    serverName: strOrNull(v.serverName),
    doneQuests: intList(v.doneQuests),
    doneAchievements: intList(v.doneAchievements),
    inventory: intRecord(v.inventory, 1),
    goals: Array.isArray(v.goals) ? v.goals.flatMap((g) => parseGoal(g) ?? []) : [],
    choices,
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : '',
  });
}

export function parseAppState(value: unknown): Result<AppState, string> {
  if (!isObj(value)) return err('état : objet attendu');
  if (value.schemaVersion !== SCHEMA_VERSION) {
    return err(
      `schemaVersion ${JSON.stringify(value.schemaVersion)} non géré (attendu : ${SCHEMA_VERSION})`,
    );
  }
  if (!Array.isArray(value.characters)) return err('characters : tableau attendu');
  const characters: Character[] = [];
  const ids = new Set<string>();
  for (const [index, raw] of value.characters.entries()) {
    const parsed = parseCharacter(raw, index);
    if (!parsed.ok) return parsed;
    if (ids.has(parsed.value.id)) return err(`characters[${index}].id : identifiant en double`);
    ids.add(parsed.value.id);
    characters.push(parsed.value);
  }
  const active =
    typeof value.activeCharacterId === 'string' && ids.has(value.activeCharacterId)
      ? value.activeCharacterId
      : null;
  return ok({
    schemaVersion: SCHEMA_VERSION,
    lastDatasetVersion:
      typeof value.lastDatasetVersion === 'string' ? value.lastDatasetVersion : '',
    activeCharacterId: active ?? characters[0]?.id ?? null,
    characters,
  });
}
