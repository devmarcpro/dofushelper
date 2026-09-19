/** Ticking a node: explicit fact in the state, then a message saying what was deduced (SPEC §9). */
import { computeEffectiveDone } from '../core/progress';
import type { NodeKey } from '../core/types';
import { setNodeDone } from '../state/actions';
import { fr } from './strings.fr';
import { character, dispatch, engine, toast } from './store';

export function tickNode(key: NodeKey, done: boolean): void {
  const who = character.value;
  const graph = engine.value?.graph;
  if (!who || !graph) return;
  const before = computeEffectiveDone(graph, who).effective.size;
  dispatch((state, deps) => setNodeDone(state, who.id, key, done, deps), true);
  const next = character.value;
  if (!next) return;
  const after = computeEffectiveDone(graph, next).effective.size;
  if (done) {
    const implied = Math.max(0, after - before - 1);
    toast.value = {
      message: implied > 0 ? fr.plan.tickedImplied(implied) : fr.plan.tickedOne,
      undoable: true,
    };
  } else {
    toast.value = { message: fr.plan.unticked(Math.max(0, before - after - 1)), undoable: true };
  }
}
