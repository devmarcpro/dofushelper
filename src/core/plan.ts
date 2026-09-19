/**
 * Goal resolution (SPEC §6.4, §6.5, §6.7): roots → expansion through prerequisites →
 * choice points → statuses → deterministic ordering. Pure; never throws on odd data:
 * cycles, missing ids and unknown criteria become DataIssues.
 */
import { leafKey, type Graph, type GraphNode } from './graph';
import type { BlockReason, ChoicePoint, DataIssue, Plan, PlanNode } from './plan-types';
import { computeEffectiveDone, type EffectiveDone } from './progress';
import type { Character, Goal, ItemId, NodeKey, Requirement } from './types';

type Tri = 'ok' | 'fail' | 'unknown';
type Profile = Pick<Character, 'level' | 'jobs' | 'alignment' | 'breedId'>;

export interface ResolveOptions {
  /** Nodes that reward an item (quests and achievements). Needed for item goals. */
  itemSources?: (itemId: ItemId) => NodeKey[];
}

// ---------- Profile evaluation ----------

/** Level, job, alignment and class. `hasItem` is a need, never a blocking condition. */
function isProfileLeaf(requirement: Requirement): boolean {
  const leaf = requirement.t === 'not' ? requirement.of : requirement;
  return ['level', 'jobLevel', 'alignment', 'breed'].includes(leaf.t);
}

/** A piece of profile that is not filled in is never blocking: it evaluates to 'unknown'. */
export function evaluateProfileLeaf(requirement: Requirement, profile: Profile): Tri {
  if (requirement.t === 'not') {
    const inner = evaluateProfileLeaf(requirement.of, profile);
    return inner === 'unknown' ? 'unknown' : inner === 'ok' ? 'fail' : 'ok';
  }
  const verdict = (known: boolean, pass: boolean): Tri =>
    known ? (pass ? 'ok' : 'fail') : 'unknown';
  switch (requirement.t) {
    case 'level':
      return verdict(profile.level !== null, (profile.level ?? 0) >= requirement.min);
    case 'jobLevel': {
      const level = profile.jobs[requirement.jobId];
      return verdict(level !== undefined, (level ?? 0) >= requirement.min);
    }
    case 'alignment':
      return verdict(profile.alignment !== null, profile.alignment === requirement.side);
    case 'breed':
      return verdict(profile.breedId !== null, profile.breedId === requirement.id);
    default:
      return 'ok';
  }
}

function blockReasonOf(requirement: Requirement): BlockReason | null {
  const negated = requirement.t === 'not';
  const leaf = requirement.t === 'not' ? requirement.of : requirement;
  switch (leaf.t) {
    case 'level':
      return negated ? null : { t: 'level', min: leaf.min };
    case 'jobLevel':
      return negated ? null : { t: 'jobLevel', jobId: leaf.jobId, min: leaf.min };
    case 'alignment':
      return { t: 'alignment', side: leaf.side, negated };
    case 'breed':
      return { t: 'breed', id: leaf.id, negated };
    default:
      return null;
  }
}

function hasNodeLeaf(requirement: Requirement): boolean {
  if (leafKey(requirement)) return true;
  if (requirement.t === 'all' || requirement.t === 'any') return requirement.of.some(hasNodeLeaf);
  return false;
}

function nodeLeaves(requirement: Requirement, into: NodeKey[] = []): NodeKey[] {
  const key = leafKey(requirement);
  if (key) into.push(key);
  else if (requirement.t === 'all' || requirement.t === 'any') {
    for (const member of requirement.of) nodeLeaves(member, into);
  }
  return into;
}

/** Profile leaves met on the mandatory path of a requirement (through `all` only). */
function mandatoryProfileLeaves(requirement: Requirement, into: Requirement[] = []): Requirement[] {
  if (isProfileLeaf(requirement)) into.push(requirement);
  else if (requirement.t === 'all')
    for (const member of requirement.of) mandatoryProfileLeaves(member, into);
  return into;
}

function worst(verdicts: Tri[]): Tri {
  if (verdicts.includes('fail')) return 'fail';
  return verdicts.includes('unknown') ? 'unknown' : 'ok';
}

// ---------- Resolution ----------

export function resolvePlan(
  graph: Graph,
  goal: Goal,
  character: Character,
  options: ResolveOptions = {},
): Plan {
  const done: EffectiveDone = computeEffectiveDone(graph, character);
  const issues: DataIssue[] = [];
  const choicePoints: ChoicePoint[] = [];
  const planNodes = new Map<NodeKey, PlanNode>();

  /** 'fail' when the branch, or the start of a node it requires, contradicts the filled-in profile. */
  const branchVerdict = (branch: Requirement): Tri => {
    const own = mandatoryProfileLeaves(branch).map((leaf) => evaluateProfileLeaf(leaf, character));
    const viaNodes = nodeLeaves(branch).flatMap((key) => {
      const node = graph.nodes.get(key);
      return node
        ? mandatoryProfileLeaves(node.requirement).map((leaf) =>
            evaluateProfileLeaf(leaf, character),
          )
        : [];
    });
    return worst([...own, ...viaNodes]);
  };

  /** Nodes still to do if this branch is taken: mandatory closure of its node leaves. */
  const remainingNodes = (branch: Requirement): number => {
    const seen = new Set<NodeKey>();
    const stack = nodeLeaves(branch);
    while (stack.length > 0) {
      const key = stack.pop();
      if (key === undefined || seen.has(key) || done.effective.has(key)) continue;
      seen.add(key);
      stack.push(...(graph.nodes.get(key)?.mandatory ?? []));
    }
    return seen.size;
  };

  /** SPEC §6.7: progress › user › profile › default (fewest remaining nodes, then first). */
  const choose = (id: string, owner: NodeKey | 'goal', branches: Requirement[]): number => {
    let chosen = branches.findIndex((branch) => {
      const leaves = nodeLeaves(branch);
      return leaves.length > 0 && leaves.every((key) => done.effective.has(key));
    });
    let chosenBy: ChoicePoint['chosenBy'] = 'progress';
    if (chosen === -1) {
      const user = character.choices[id];
      if (user !== undefined && Number.isInteger(user) && user >= 0 && user < branches.length) {
        chosen = user;
        chosenBy = 'user';
      }
    }
    if (chosen === -1) {
      const compatible = branches
        .map((b, index) => ({ index, verdict: branchVerdict(b) }))
        .filter((b) => b.verdict !== 'fail');
      // Exactly one branch is left once the filled-in profile has ruled out the others.
      const sole = compatible.length === 1 && branches.length > 1 ? compatible[0] : undefined;
      if (sole) {
        chosen = sole.index;
        chosenBy = 'profile';
      }
    }
    if (chosen === -1) {
      chosenBy = 'default';
      let best = Number.POSITIVE_INFINITY;
      branches.forEach((branch, index) => {
        if (branchVerdict(branch) === 'fail' && branches.some((b) => branchVerdict(b) !== 'fail'))
          return;
        const remaining = remainingNodes(branch);
        if (remaining < best) {
          best = remaining;
          chosen = index;
        }
      });
      if (chosen === -1) chosen = 0;
    }
    choicePoints.push({ id, owner, branches, chosen, chosenBy });
    return chosen;
  };

  const expand = (key: NodeKey, referencedBy: NodeKey | 'goal', stack: NodeKey[]): boolean => {
    if (planNodes.has(key)) return true;
    const node = graph.nodes.get(key);
    if (!node) {
      if (!issues.some((i) => i.t === 'missingNode' && i.key === key))
        issues.push({ t: 'missingNode', key, referencedBy });
      return false;
    }
    const planNode: PlanNode = {
      key,
      status: 'blocked',
      impliedBy: done.implied.get(key) ?? null,
      blockedBy: [],
      dependsOn: [],
      unlocks: [],
      exclusions: [...node.exclusions],
      conditions: [],
      context: [],
    };
    planNodes.set(key, planNode);
    const path = [...stack, key];

    const walk = (requirement: Requirement, position: string): void => {
      const leaf = leafKey(requirement);
      if (leaf) {
        if (leaf === key) return;
        if (path.includes(leaf)) {
          issues.push({ t: 'cycle', path: [...path.slice(path.indexOf(leaf)), leaf] });
          return;
        }
        if (expand(leaf, key, path) && !planNode.dependsOn.includes(leaf))
          planNode.dependsOn.push(leaf);
        return;
      }
      switch (requirement.t) {
        case 'all':
          requirement.of.forEach((member, index) => walk(member, `${position}.${index}`));
          return;
        case 'any': {
          if (requirement.of.some(hasNodeLeaf)) {
            const chosen = choose(`${key}#${position}`, key, requirement.of);
            const branch = requirement.of[chosen];
            if (branch) walk(branch, `${position}.${chosen}`);
            return;
          }
          // An `any` without nodes: satisfied unless every branch contradicts the profile.
          const verdicts = requirement.of.map(branchVerdict);
          if (verdicts.length > 0 && verdicts.every((v) => v === 'fail')) {
            const first = requirement.of[0];
            if (first) planNode.conditions.push(...mandatoryProfileLeaves(first));
          }
          for (const member of requirement.of) collectContext(member);
          return;
        }
        case 'context':
          planNode.context.push(requirement.raw);
          return;
        case 'unknown':
          planNode.context.push(requirement.raw);
          issues.push({ t: 'unknownCriterion', raw: requirement.raw, owner: key });
          return;
        case 'not':
          if (isProfileLeaf(requirement)) planNode.conditions.push(requirement);
          else if (requirement.of.t === 'hasItem') planNode.conditions.push(requirement);
          return; // a negated quest state is already in `exclusions`
        default:
          planNode.conditions.push(requirement); // level, jobLevel, alignment, breed, hasItem
      }
    };

    const collectContext = (requirement: Requirement): void => {
      if (requirement.t === 'context' || requirement.t === 'unknown') {
        if (!planNode.context.includes(requirement.raw)) planNode.context.push(requirement.raw);
      } else if (requirement.t === 'all' || requirement.t === 'any') {
        requirement.of.forEach(collectContext);
      }
    };

    walk(node.requirement, '0');
    return true;
  };

  // ---------- Roots ----------
  let roots: NodeKey[];
  if (goal.t === 'quest') roots = [`q:${goal.id}`];
  else if (goal.t === 'achievement') roots = [`a:${goal.id}`];
  else {
    const sources = (options.itemSources?.(goal.itemId) ?? []).filter((key) =>
      graph.nodes.has(key),
    );
    if (sources.length === 0) issues.push({ t: 'noSourceForItem', itemId: goal.itemId });
    if (sources.length > 1) {
      const branches = sources.map((key): Requirement => {
        const id = Number(key.slice(2));
        return key.startsWith('q:') ? { t: 'questDone', id } : { t: 'achievementDone', id };
      });
      const chosen = sources[choose('goal#0', 'goal', branches)];
      roots = chosen ? [chosen] : [];
    } else {
      roots = sources;
    }
  }
  for (const root of roots) expand(root, 'goal', []);

  // ---------- Statuses ----------
  for (const planNode of planNodes.values()) {
    if (done.explicit.has(planNode.key)) planNode.status = 'done';
    else if (done.implied.has(planNode.key)) planNode.status = 'implied';
    else {
      for (const dependency of planNode.dependsOn) {
        if (!done.effective.has(dependency))
          planNode.blockedBy.push({ t: 'node', key: dependency });
      }
      for (const condition of planNode.conditions) {
        if (!isProfileLeaf(condition) || evaluateProfileLeaf(condition, character) !== 'fail')
          continue;
        const reason = blockReasonOf(condition);
        if (reason) planNode.blockedBy.push(reason);
      }
      planNode.status = planNode.blockedBy.length === 0 ? 'available' : 'blocked';
    }
    for (const dependency of planNode.dependsOn)
      planNodes.get(dependency)?.unlocks.push(planNode.key);
  }

  // ---------- Ordering: Kahn with a deterministic tie-break ----------
  const rank = (node: GraphNode | undefined): [number, number, number, number, number] => [
    node?.orderHint ?? Number.MAX_SAFE_INTEGER,
    node?.levelMin ?? 0,
    node?.categoryId ?? Number.MAX_SAFE_INTEGER,
    node?.kind === 'quest' ? 0 : 1,
    node?.id ?? 0,
  ];
  const compare = (a: NodeKey, b: NodeKey): number => {
    const ra = rank(graph.nodes.get(a));
    const rb = rank(graph.nodes.get(b));
    for (let i = 0; i < ra.length; i += 1) {
      const diff = (ra[i] ?? 0) - (rb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };
  const pending = new Map<NodeKey, number>();
  for (const planNode of planNodes.values()) pending.set(planNode.key, planNode.dependsOn.length);
  const ready = [...pending].filter(([, count]) => count === 0).map(([key]) => key);
  const ordered: PlanNode[] = [];
  while (ready.length > 0) {
    ready.sort(compare);
    const key = ready.shift();
    const planNode = key ? planNodes.get(key) : undefined;
    if (!key || !planNode) continue;
    ordered.push(planNode);
    pending.delete(key);
    for (const next of planNode.unlocks) {
      const count = (pending.get(next) ?? 0) - 1;
      pending.set(next, count);
      if (count === 0) ready.push(next);
    }
  }
  // Defensive: anything left (it would take an undetected cycle) is appended in rank order.
  for (const key of [...pending.keys()].sort(compare)) {
    const planNode = planNodes.get(key);
    if (planNode) ordered.push(planNode);
  }
  for (const planNode of ordered) planNode.unlocks.sort(compare);

  return {
    goal,
    nodes: ordered,
    choicePoints,
    progress: {
      done: ordered.filter((n) => n.status === 'done' || n.status === 'implied').length,
      total: ordered.length,
    },
    nextActions: ordered.filter((n) => n.status === 'available').map((n) => n.key),
    issues,
  };
}
