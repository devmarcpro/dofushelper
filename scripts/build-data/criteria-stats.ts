/** Pure statistics over criterion strings, for data:report (SPEC §6.1, M1-4). */
import {
  hasMixedPrecedence,
  parseCriterionSyntax,
  type CriterionAst,
  type ParseError,
} from '../../src/core/criteria';

/** Keys of the table in DATA_SOURCES.md §4 (quest start criteria). */
export const KNOWN_KEYS: ReadonlySet<string> = new Set([
  'PL',
  'Qf',
  'Qa',
  'Ad',
  'Pr',
  'Ps',
  'Pa',
  'Sc',
  'PO',
  'Qo',
  'Pm',
  'PG',
  'Qc',
  'PJ',
  'PZ',
  'Pz',
  'BT',
  'OA',
  'Pj',
  'WE',
  'QF',
  'DD',
  'DH',
  'DM',
  'SC',
  'ST',
  'Sv',
  'HA',
]);

export interface CriterionSample {
  raw: string;
  /** Who carries it, e.g. "quête 1329". */
  owner: string;
}

export interface CriteriaStats {
  total: number;
  empty: number;
  parsed: number;
  failed: { raw: string; owner: string; error: ParseError }[];
  byKey: Map<string, number>;
  byOp: Map<string, number>;
  /** Keys absent from KNOWN_KEYS, with up to three examples each. */
  unknownKeys: Map<string, { count: number; examples: string[] }>;
  mixedPrecedence: CriterionSample[];
  longest: CriterionSample[];
  /** Largest number of arguments seen on an atom, and atoms carrying an identifier argument. */
  maxArgs: number;
  identifierArgs: number;
}

function walk(
  ast: CriterionAst,
  visit: (atom: Extract<CriterionAst, { k: 'atom' }>) => void,
): void {
  if (ast.k === 'atom') visit(ast);
  else for (const item of ast.items) walk(item, visit);
}

export function computeCriteriaStats(samples: readonly CriterionSample[]): CriteriaStats {
  const stats: CriteriaStats = {
    total: samples.length,
    empty: 0,
    parsed: 0,
    failed: [],
    byKey: new Map(),
    byOp: new Map(),
    unknownKeys: new Map(),
    mixedPrecedence: [],
    longest: [],
    maxArgs: 0,
    identifierArgs: 0,
  };
  for (const sample of samples) {
    if (sample.raw.length === 0) {
      stats.empty += 1;
      continue;
    }
    if (hasMixedPrecedence(sample.raw)) stats.mixedPrecedence.push(sample);
    const result = parseCriterionSyntax(sample.raw);
    if (!result.ok) {
      stats.failed.push({ ...sample, error: result.error });
      continue;
    }
    stats.parsed += 1;
    walk(result.value, (atom) => {
      stats.byKey.set(atom.key, (stats.byKey.get(atom.key) ?? 0) + 1);
      stats.byOp.set(atom.op, (stats.byOp.get(atom.op) ?? 0) + 1);
      stats.maxArgs = Math.max(stats.maxArgs, atom.args.length);
      if (atom.args.some((arg) => typeof arg === 'string')) stats.identifierArgs += 1;
      if (!KNOWN_KEYS.has(atom.key)) {
        const entry = stats.unknownKeys.get(atom.key) ?? { count: 0, examples: [] };
        entry.count += 1;
        if (entry.examples.length < 3 && !entry.examples.includes(atom.raw))
          entry.examples.push(atom.raw);
        stats.unknownKeys.set(atom.key, entry);
      }
    });
  }
  stats.longest = [...samples]
    .sort((a, b) => b.raw.length - a.raw.length || a.owner.localeCompare(b.owner))
    .slice(0, 10);
  return stats;
}

/** Share of non-empty criteria that parse, between 0 and 1 (1 when there is nothing to parse). */
export function parsedShare(stats: CriteriaStats): number {
  const nonEmpty = stats.total - stats.empty;
  return nonEmpty === 0 ? 1 : stats.parsed / nonEmpty;
}

/** Ids cited by criteria, per kind, to detect orphan references. */
export function citedIds(samples: readonly CriterionSample[]): {
  quests: Map<number, string>;
  achievements: Map<number, string>;
} {
  const quests = new Map<number, string>();
  const achievements = new Map<number, string>();
  for (const sample of samples) {
    const result = parseCriterionSyntax(sample.raw);
    if (!result.ok) continue;
    walk(result.value, (atom) => {
      const first = atom.args[0];
      if (typeof first !== 'number') return;
      if (['Qf', 'QF', 'Qa', 'Qc'].includes(atom.key) && !quests.has(first))
        quests.set(first, sample.owner);
      if (atom.key === 'OA' && !achievements.has(first)) achievements.set(first, sample.owner);
    });
  }
  return { quests, achievements };
}
