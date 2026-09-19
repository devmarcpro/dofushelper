/** Compiles a raw game criterion into the form stored in the dataset. Never throws. */
import {
  parseCriterion,
  parseCriterionSyntax,
  simplify,
  toRequirement,
  type CriterionAst,
} from './criteria';
import type { CompiledCriterion } from './dataset';
import type { Requirement } from './types';

export function compileCriterion(raw: string): CompiledCriterion {
  const parsed = parseCriterion(raw);
  return parsed.ok
    ? { raw, req: parsed.value }
    : { raw, req: { t: 'unknown', raw }, error: parsed.error };
}

// ---------- Manual overrides (SPEC §7) ----------

export interface CriterionOverride {
  /** Prerequisites the game data does not expose (e.g. hidden in an NPC dialogue). */
  addRequires?: readonly unknown[];
  /** Raw atoms of the game criterion to ignore, e.g. "Qf=216". */
  removeRequires?: readonly string[];
}

export interface OverrideOutcome {
  criterion: CompiledCriterion;
  /** Atoms to remove that the criterion does not contain (any more): the override is obsolete. */
  unusedRemovals: string[];
  /** Additions already required by the game data: the override is obsolete. */
  redundantAdditions: Requirement[];
  /** Additions that are not a valid requirement leaf: the build must fail. */
  invalidAdditions: unknown[];
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Only plain leaves can be added by hand; groups and negations are not supported on purpose. */
export function parseRequirementLeaf(value: unknown): Requirement | null {
  if (value === null || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  switch (v.t) {
    case 'questDone':
    case 'achievementDone':
      return isInt(v.id) && v.id > 0 ? { t: v.t, id: v.id } : null;
    case 'breed':
      return isInt(v.id) && v.id > 0 ? { t: 'breed', id: v.id } : null;
    case 'level':
      return isInt(v.min) && v.min > 0 ? { t: 'level', min: v.min } : null;
    case 'jobLevel':
      return isInt(v.jobId) && isInt(v.min) && v.min > 0
        ? { t: 'jobLevel', jobId: v.jobId, min: v.min }
        : null;
    case 'alignment':
      return v.side === 0 || v.side === 1 || v.side === 2 ? { t: 'alignment', side: v.side } : null;
    case 'hasItem':
      return isInt(v.itemId) && isInt(v.qty) && v.qty > 0
        ? { t: 'hasItem', itemId: v.itemId, qty: v.qty }
        : null;
    default:
      return null;
  }
}

/** Removes the atoms whose raw text is listed; an emptied group disappears. */
function removeAtoms(
  ast: CriterionAst,
  removals: ReadonlySet<string>,
  used: Set<string>,
): CriterionAst | null {
  if (ast.k === 'atom') {
    if (!removals.has(ast.raw)) return ast;
    used.add(ast.raw);
    return null;
  }
  const items = ast.items.flatMap((item) => removeAtoms(item, removals, used) ?? []);
  const first = items[0];
  if (items.length === 0 || first === undefined) return null;
  return items.length === 1 ? first : { k: ast.k, items };
}

export function compileCriterionWithOverride(
  raw: string,
  override: CriterionOverride | undefined,
): OverrideOutcome {
  const removals = new Set(override?.removeRequires ?? []);
  const used = new Set<string>();
  let criterion = compileCriterion(raw);

  if (removals.size > 0) {
    const parsed = parseCriterionSyntax(raw);
    if (parsed.ok) {
      const kept = removeAtoms(parsed.value, removals, used);
      criterion = { raw, req: kept ? toRequirement(kept) : { t: 'all', of: [] } };
    }
  }

  const additions: Requirement[] = [];
  const redundantAdditions: Requirement[] = [];
  const invalidAdditions: unknown[] = [];
  const existing = new Set(
    (criterion.req.t === 'all' ? criterion.req.of : [criterion.req]).map((r) => JSON.stringify(r)),
  );
  for (const candidate of override?.addRequires ?? []) {
    const leaf = parseRequirementLeaf(candidate);
    if (!leaf) invalidAdditions.push(candidate);
    else if (existing.has(JSON.stringify(leaf))) redundantAdditions.push(leaf);
    else additions.push(leaf);
  }
  if (additions.length > 0) {
    criterion = { ...criterion, req: simplify({ t: 'all', of: [criterion.req, ...additions] }) };
  }

  return {
    criterion,
    unusedRemovals: [...removals].filter((atom) => !used.has(atom)),
    redundantAdditions,
    invalidAdditions,
  };
}
