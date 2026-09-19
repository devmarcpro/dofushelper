/** Semantic stage of the criterion parser (SPEC §6.1): syntactic AST → Requirement. Cannot fail. */
import { err, ok, type Result } from '../result';
import type { Requirement } from '../types';
import type { CriterionAst, ParseError } from './ast';
import { atomToRequirement } from './criteria-map';
import { parseCriterionSyntax } from './parse';

const TRUE: Requirement = { t: 'all', of: [] };

function isTrue(requirement: Requirement): boolean {
  return requirement.t === 'all' && requirement.of.length === 0;
}

/**
 * Flattens nested all/any, removes duplicates and "always true" members,
 * reduces a group of one element to that element. `any` with a true member is true.
 */
export function simplify(requirement: Requirement): Requirement {
  if (requirement.t === 'not') return { t: 'not', of: simplify(requirement.of) };
  if (requirement.t !== 'all' && requirement.t !== 'any') return requirement;

  const kind = requirement.t;
  const members: Requirement[] = [];
  const seen = new Set<string>();
  for (const raw of requirement.of) {
    const member = simplify(raw);
    const flat = member.t === kind ? member.of : [member];
    for (const item of flat) {
      if (isTrue(item)) {
        if (kind === 'any') return TRUE;
        continue;
      }
      const signature = JSON.stringify(item);
      if (seen.has(signature)) continue;
      seen.add(signature);
      members.push(item);
    }
  }
  const first = members[0];
  if (members.length === 1 && first !== undefined) return first;
  return { t: kind, of: members };
}

export function toRequirement(ast: CriterionAst): Requirement {
  const convert = (node: CriterionAst): Requirement =>
    node.k === 'atom'
      ? atomToRequirement(node)
      : { t: node.k === 'and' ? 'all' : 'any', of: node.items.map(convert) };
  return simplify(convert(ast));
}

/** Both stages. Only the syntactic stage can fail. */
export function parseCriterion(raw: string): Result<Requirement, ParseError> {
  const parsed = parseCriterionSyntax(raw);
  return parsed.ok ? ok(toRequirement(parsed.value)) : err(parsed.error);
}
