/** Ticking a node: explicit fact in the state, then a message saying what was deduced (SPEC §9). */
import type { NodeKey } from '../core/types';
import { setNodeDone } from '../state/actions';
import { fr } from './strings.fr';
import { character, dispatch, effectiveDone, toast } from './store';

export function tickNode(key: NodeKey, done: boolean): void {
  const who = character.value;
  // Shared with the rendering, so a click walks the graph once instead of three times.
  const before = effectiveDone.value?.effective.size;
  if (!who || before === undefined) return;
  dispatch((state, deps) => setNodeDone(state, who.id, key, done, deps), true);
  const after = effectiveDone.value?.effective.size ?? before;
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
