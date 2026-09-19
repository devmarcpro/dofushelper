/**
 * Effective progression (SPEC §6.3):
 *   explicitDone  = what the player ticked
 *   impliedDone   = transitive closure of MANDATORY edges, going up from the explicit ticks,
 *                   plus the achievements that can be deduced from what is done
 *   effectiveDone = explicitDone ∪ impliedDone
 * Alternative edges propagate nothing: we do not know which branch was taken.
 */
import { achievementKey, leafKey, questKey, type Graph } from './graph';
import type { Character, NodeKey, Requirement } from './types';

export interface EffectiveDone {
  explicit: Set<NodeKey>;
  /** Implied node → the node it was deduced from (for "déduit de : …"). */
  implied: Map<NodeKey, NodeKey>;
  effective: Set<NodeKey>;
}

function satisfiedByNodes(requirement: Requirement, done: ReadonlySet<NodeKey>): boolean {
  const key = leafKey(requirement);
  if (key) return done.has(key);
  return (
    requirement.t === 'all' && requirement.of.every((member) => satisfiedByNodes(member, done))
  );
}

export function computeEffectiveDone(
  graph: Graph,
  character: Pick<Character, 'doneQuests' | 'doneAchievements'>,
): EffectiveDone {
  const explicit = new Set<NodeKey>([
    ...character.doneQuests.map(questKey),
    ...character.doneAchievements.map(achievementKey),
  ]);
  const implied = new Map<NodeKey, NodeKey>();
  const effective = new Set<NodeKey>(explicit);

  /** Marks every mandatory ancestor of `start` as implied. Cycle-safe: a key is visited once. */
  const propagateUp = (start: NodeKey): void => {
    const stack: NodeKey[] = [start];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;
      for (const prerequisite of graph.nodes.get(current)?.mandatory ?? []) {
        if (effective.has(prerequisite) || !graph.nodes.has(prerequisite)) continue;
        effective.add(prerequisite);
        implied.set(prerequisite, current);
        stack.push(prerequisite);
      }
    }
  };

  for (const key of explicit) propagateUp(key);

  // Deducible achievements: all their objectives are node leaves, all satisfied. Fixpoint,
  // because a deduced achievement may complete another one.
  const deducible = [...graph.nodes.values()].filter((node) => node.deducible);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of deducible) {
      if (effective.has(node.key) || !satisfiedByNodes(node.requirement, effective)) continue;
      effective.add(node.key);
      const source = node.mandatory.find((key) => effective.has(key)) ?? node.key;
      implied.set(node.key, source);
      propagateUp(node.key);
      changed = true;
    }
  }

  return { explicit, implied, effective };
}
