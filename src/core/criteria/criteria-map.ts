/**
 * The single table that gives a meaning to criterion keys (SPEC §6.1, DATA_SOURCES.md §4).
 * - "engine" keys produce typed leaves the plan can reason about;
 * - "context" keys are true in game but cannot be driven by a plan (event, map, subscription…);
 * - every other key, and every engine key used in a shape we have not observed, is `unknown`.
 * Nothing here can fail: the worst case is `unknown`, displayed raw and never blocking.
 */
import type { Requirement } from '../types';
import type { CriterionAtom } from './ast';

/** Keys whose meaning is established enough to display, but that a plan cannot act on. */
export const CONTEXT_KEYS: ReadonlySet<string> = new Set([
  'Qa', // quest in progress
  'Ad', // Almanax calendar day
  'Pr', // alignment order / rank
  'Pa', // alignment level
  'Sc', // server-side content flag
  'Qo', // quest objective state
  'Pm', // map the character stands on
  'Qc', // quest can be started
  'PZ', // subscription
  'Pz',
  'Pj', // job-related (≠ PJ)
  'WE', // world event
  'DD', // delay in days / hours / minutes tied to an item
  'DH',
  'DM',
  'SC', // server type
  'ST', // season
]);

const unknown = (atom: CriterionAtom): Requirement => ({ t: 'unknown', raw: atom.raw });
const context = (atom: CriterionAtom): Requirement => ({
  t: 'context',
  key: atom.key,
  raw: atom.raw,
});

function ints(atom: CriterionAtom, count: number): number[] | null {
  if (atom.args.length !== count) return null;
  const values: number[] = [];
  for (const arg of atom.args) {
    if (typeof arg !== 'number') return null;
    values.push(arg);
  }
  return values;
}

/** `=` → the leaf, `!` → not(leaf), anything else → unknown. */
function equality(atom: CriterionAtom, leaf: Requirement): Requirement {
  if (atom.op === '=') return leaf;
  if (atom.op === '!') return { t: 'not', of: leaf };
  return unknown(atom);
}

type AtomHandler = (atom: CriterionAtom) => Requirement;

const ENGINE_KEYS: Readonly<Record<string, AtomHandler>> = {
  // Always "BT=1": no condition.
  BT: (atom) =>
    atom.op === '=' && ints(atom, 1)?.[0] === 1 ? { t: 'all', of: [] } : unknown(atom),

  // Character level. "PL>109" means level ≥ 110. A ceiling ("PL<51", event quests) is context.
  PL: (atom) => {
    const level = ints(atom, 1)?.[0];
    if (level === undefined) return unknown(atom);
    if (atom.op === '>') return { t: 'level', min: level + 1 };
    if (atom.op === '<') return context(atom);
    return unknown(atom);
  },

  // Quest finished / not finished. A negated quest state is a mutual exclusion, never a prerequisite.
  Qf: (atom) => {
    const id = ints(atom, 1)?.[0];
    return id === undefined ? unknown(atom) : equality(atom, { t: 'questDone', id });
  },

  // "QF>questId,n": finished more than n times. n = 0 is "finished"; above, a plan cannot drive it.
  QF: (atom) => {
    const values = ints(atom, 2);
    if (!values || atom.op !== '>') return unknown(atom);
    const [id, times] = values;
    if (id === undefined || times === undefined) return unknown(atom);
    return times === 0 ? { t: 'questDone', id } : context(atom);
  },

  // Achievement obtained.
  OA: (atom) => {
    const id = ints(atom, 1)?.[0];
    return id === undefined ? unknown(atom) : equality(atom, { t: 'achievementDone', id });
  },

  // Alignment side: 1 Bonta, 2 Brâkmar. Neutral is written "Ps!1&Ps!2". Other sides are context.
  Ps: (atom) => {
    const side = ints(atom, 1)?.[0];
    if (side === 0 || side === 1 || side === 2) return equality(atom, { t: 'alignment', side });
    return side === undefined ? unknown(atom) : context(atom);
  },

  // Character class.
  PG: (atom) => {
    const id = ints(atom, 1)?.[0];
    return id === undefined ? unknown(atom) : equality(atom, { t: 'breed', id });
  },

  // Job level: "PJ>jobId,level" means level ≥ level + 1, like PL.
  PJ: (atom) => {
    const values = ints(atom, 2);
    if (!values || atom.op !== '>') return unknown(atom);
    const [jobId, level] = values;
    if (jobId === undefined || level === undefined) return unknown(atom);
    return { t: 'jobLevel', jobId, min: level + 1 };
  },

  // Item owned: "PO=id", "PO!id", "PO>id,n" (more than n). The 'E' operator is not understood yet.
  PO: (atom) => {
    const [itemId, count] = atom.args;
    if (typeof itemId !== 'number') return unknown(atom);
    if (atom.args.length === 1) return equality(atom, { t: 'hasItem', itemId, qty: 1 });
    if (atom.args.length === 2 && typeof count === 'number' && atom.op === '>') {
      return { t: 'hasItem', itemId, qty: count + 1 };
    }
    return unknown(atom);
  },
};

export function atomToRequirement(atom: CriterionAtom): Requirement {
  const handler = Object.hasOwn(ENGINE_KEYS, atom.key) ? ENGINE_KEYS[atom.key] : undefined;
  if (handler) return handler(atom);
  return CONTEXT_KEYS.has(atom.key) ? context(atom) : unknown(atom);
}

/** Role of a key, for data:report and the UI. */
export function keyRole(key: string): 'engine' | 'context' | 'unknown' {
  if (Object.hasOwn(ENGINE_KEYS, key)) return 'engine';
  return CONTEXT_KEYS.has(key) ? 'context' : 'unknown';
}
