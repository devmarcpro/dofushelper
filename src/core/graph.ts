/**
 * Prerequisite graph (SPEC §6.2). Nodes are every quest and every achievement of the dataset.
 * An edge "prerequisite → node" is MANDATORY when the path to the questDone / achievementDone
 * leaf only crosses `all`, ALTERNATIVE when it crosses an `any`. A path through a `not` never
 * creates an edge: a negated quest state is a mutual exclusion, kept aside for display.
 */
import { toRequirement } from './criteria';
import type { CompiledCriterion, CompiledDataset } from './dataset';
import type { NodeKey, Requirement } from './types';

export interface GraphNode {
  key: NodeKey;
  kind: 'quest' | 'achievement';
  id: number;
  name: string;
  levelMin: number;
  categoryId: number | null;
  orderHint: number | null;
  /** Quest: its start requirement. Achievement: `all` of its objectives. */
  requirement: Requirement;
  mandatory: NodeKey[];
  alternative: NodeKey[];
  /** Nodes this one is incompatible with ("Qf!216"). Never blocking, always displayed. */
  exclusions: NodeKey[];
  /**
   * Achievement whose objectives are all questDone / achievementDone leaves under `all`,
   * with no objective missing upstream: it can be deduced from the progression (SPEC §6.3).
   */
  deducible: boolean;
}

export interface Graph {
  nodes: Map<NodeKey, GraphNode>;
  /** Reverse index: what finishing a node helps unlock (mandatory and alternative edges). */
  unlocks: Map<NodeKey, NodeKey[]>;
  /** Keys cited by a criterion but absent from the dataset, with the nodes citing them. */
  missing: Map<NodeKey, NodeKey[]>;
}

export function questKey(id: number): NodeKey {
  return `q:${id}`;
}

export function achievementKey(id: number): NodeKey {
  return `a:${id}`;
}

export function criterionRequirement(criterion: CompiledCriterion): Requirement {
  return criterion.ast ? toRequirement(criterion.ast) : { t: 'unknown', raw: criterion.raw };
}

export function leafKey(requirement: Requirement): NodeKey | null {
  if (requirement.t === 'questDone') return questKey(requirement.id);
  if (requirement.t === 'achievementDone') return achievementKey(requirement.id);
  return null;
}

interface Edges {
  mandatory: Set<NodeKey>;
  alternative: Set<NodeKey>;
  exclusions: Set<NodeKey>;
}

function collectEdges(requirement: Requirement, throughAny: boolean, edges: Edges): void {
  switch (requirement.t) {
    case 'all':
      for (const member of requirement.of) collectEdges(member, throughAny, edges);
      return;
    case 'any':
      for (const member of requirement.of) collectEdges(member, true, edges);
      return;
    case 'not': {
      const excluded = leafKey(requirement.of);
      if (excluded) edges.exclusions.add(excluded);
      return; // never an edge through a not
    }
    default: {
      const key = leafKey(requirement);
      if (key) (throughAny ? edges.alternative : edges.mandatory).add(key);
    }
  }
}

function isPureNodeConjunction(requirement: Requirement): boolean {
  if (leafKey(requirement)) return true;
  return (
    requirement.t === 'all' &&
    requirement.of.length > 0 &&
    requirement.of.every(isPureNodeConjunction)
  );
}

const sortKeys = (keys: Iterable<NodeKey>): NodeKey[] =>
  [...keys].sort((a, b) =>
    a[0] === b[0] ? Number(a.slice(2)) - Number(b.slice(2)) : a < b ? -1 : 1,
  );

export function buildGraph(dataset: Pick<CompiledDataset, 'quests' | 'achievements'>): Graph {
  const nodes = new Map<NodeKey, GraphNode>();

  const addNode = (
    base: Pick<GraphNode, 'key' | 'kind' | 'id' | 'name' | 'levelMin' | 'categoryId' | 'orderHint'>,
    requirement: Requirement,
    deducible: boolean,
  ): void => {
    const edges: Edges = { mandatory: new Set(), alternative: new Set(), exclusions: new Set() };
    collectEdges(requirement, false, edges);
    edges.mandatory.delete(base.key); // a node never requires itself
    edges.alternative.delete(base.key);
    for (const key of edges.mandatory) edges.alternative.delete(key);
    nodes.set(base.key, {
      ...base,
      requirement,
      mandatory: sortKeys(edges.mandatory),
      alternative: sortKeys(edges.alternative),
      exclusions: sortKeys(edges.exclusions),
      deducible,
    });
  };

  for (const quest of dataset.quests) {
    addNode(
      {
        key: questKey(quest.id),
        kind: 'quest',
        id: quest.id,
        name: quest.name,
        levelMin: quest.levelMin,
        categoryId: quest.categoryId,
        orderHint: quest.override?.orderHint ?? null,
      },
      criterionRequirement(quest.start),
      false,
    );
  }

  for (const achievement of dataset.achievements) {
    const objectives = achievement.objectives.map((o) => criterionRequirement(o.criterion));
    const requirement: Requirement = { t: 'all', of: objectives };
    addNode(
      {
        key: achievementKey(achievement.id),
        kind: 'achievement',
        id: achievement.id,
        name: achievement.name,
        levelMin: achievement.level ?? 0,
        categoryId: achievement.categoryId,
        orderHint: achievement.override?.orderHint ?? null,
      },
      requirement,
      objectives.length > 0 &&
        achievement.missingObjectiveIds.length === 0 &&
        objectives.every(isPureNodeConjunction),
    );
  }

  const unlocks = new Map<NodeKey, NodeKey[]>();
  const missing = new Map<NodeKey, NodeKey[]>();
  for (const node of nodes.values()) {
    for (const prerequisite of [...node.mandatory, ...node.alternative]) {
      const index = nodes.has(prerequisite) ? unlocks : missing;
      const list = index.get(prerequisite);
      if (list) list.push(node.key);
      else index.set(prerequisite, [node.key]);
    }
  }
  for (const list of [...unlocks.values(), ...missing.values()])
    list.splice(0, list.length, ...sortKeys(list));

  return { nodes, unlocks, missing };
}
