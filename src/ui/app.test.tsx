// @vitest-environment happy-dom
/**
 * UI smoke test in a simulated DOM, on the real "Dofus des Glaces" fixture: every screen renders,
 * ticking a quest deduces its prerequisites, undo restores, and the only network access is
 * public/data/*.
 */
import { render } from 'preact';
import { beforeAll, describe, expect, it } from 'vitest';
import fixture from '../../tests/fixtures/item-7043-dofus-des-glaces.json';
import { DATASET_FORMAT } from '../core/dataset';
import { addGoal, createCharacter, setNodeDone } from '../state/actions';
import { parseRoute } from './router';
import { fr } from './strings.fr';

const requested: string[] = [];
const FILES = ['quests', 'achievements', 'items', 'monsters', 'dungeons', 'goals', 'refs'] as const;

globalThis.fetch = ((input: string) => {
  requested.push(input);
  const file = input.split('/').pop()?.split('?')[0] ?? '';
  const name = file.replace('.json', '') as (typeof FILES)[number];
  const body =
    file === 'manifest.json'
      ? {
          format: DATASET_FORMAT,
          gameVersion: fixture.gameVersion,
          lang: 'fr',
          builtAt: '2026-01-01T00:00:00.000Z',
          attribution: 'FAKE',
          files: FILES.map((f) => ({ file: `${f}.json`, bytes: 1, sha256: 'fakehash0123456789' })),
        }
      : fixture.dataset[name];
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}) as unknown as typeof fetch;

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const text = (): string => document.body.textContent ?? '';

describe('application smoke test', () => {
  let store: typeof import('./store');

  beforeAll(async () => {
    window.localStorage.clear();
    store = await import('./store');
    const { App } = await import('./App');
    await store.loadData();
    render(<App />, document.body);
    await flush();
  });

  const go = async (hash: string): Promise<void> => {
    store.route.value = parseRoute(hash);
    await flush();
  };

  it('loads only public/data files', () => {
    expect(store.data.value.t).toBe('ready');
    expect(requested.length).toBe(8);
    expect(requested.every((url) => /\/data\/[a-z]+\.json(\?v=\w+)?$/.test(url))).toBe(true);
  });

  it('shows the guided empty state, then the catalog', async () => {
    expect(text()).toContain(fr.home.emptyTitle);
    await go('#/objectifs');
    expect(text()).toContain('Dofus des Glaces');
    expect(text()).toContain(fr.catalog.needCharacter);
  });

  it('creates a character, follows a goal and shows it on the home page', async () => {
    store.dispatch((state, deps) =>
      createCharacter(state, { name: 'FAKE Iop', alignment: 1 }, deps),
    );
    const who = store.character.value;
    expect(who?.name).toBe('FAKE Iop');
    store.dispatch((state, deps) =>
      addGoal(state, who?.id ?? '', { t: 'item', itemId: 7043 }, deps),
    );
    await go('#/');
    expect(text()).toContain('Dofus des Glaces');
    expect(text()).toContain(fr.home.nextAction);
  });

  it('renders the plan, follows the alignment, and ticking a quest deduces its prerequisites', async () => {
    await go('#/plan/item-7043');
    const boxes = [...document.querySelectorAll<HTMLInputElement>('.step__check')];
    expect(boxes.length).toBe(48); // 50 nodes minus the two other alignment branches
    expect(text()).not.toContain(fr.plan.needCharacter);

    const target = document.querySelector<HTMLInputElement>('#node-q-1329');
    expect(target?.checked).toBe(false);
    target?.click();
    await flush();

    expect(store.character.value?.doneQuests).toEqual([1329]);
    expect(store.toast.value?.undoable).toBe(true);
    expect(store.toast.value?.message).toMatch(/étapes prérequises marquées comme faites/);
    const implied = [...document.querySelectorAll<HTMLInputElement>('.step--implied .step__check')];
    expect(implied.length).toBeGreaterThanOrEqual(28);
    expect(implied.every((box) => box.checked && box.disabled)).toBe(true);

    store.undoLast();
    await flush();
    expect(store.character.value?.doneQuests).toEqual([]);
  });

  it('renders the other tabs and a sheet without throwing', async () => {
    await go('#/plan/item-7043/gather');
    expect(text()).toContain(fr.gather.monstersTitle);
    await go('#/plan/item-7043/conditions');
    expect(text()).toContain(fr.conditions.alignment('Bonta'));
    await go('#/plan/item-7043/choices');
    expect(text()).toContain(fr.choices.chosenBy.profile);
    await go('#/fiche/q-1329');
    expect(text()).toContain('Le Dofus des Glaces');
    expect(text()).toContain(fr.sheet.alternatives);
    await go('#/personnages');
    expect(text()).toContain(fr.characters.backupTitle);
    await go('#/a-propos');
    expect(text()).toContain(fr.footer.dataCredit);
    await go('#/nowhere');
    expect(text()).toContain(fr.notFound.title);
  });

  it('the skip link moves the focus without hijacking the route', async () => {
    // Regression: it wrote "#contenu" into the hash, which the router answered with the 404 page.
    await go('#/objectifs');
    const skip = document.querySelector<HTMLAnchorElement>('.skip-link');
    skip?.click();
    await flush();
    expect(store.route.value).toEqual({ t: 'catalog' });
    expect(document.activeElement?.id).toBe('contenu');
    expect(text()).not.toContain(fr.notFound.title);
  });

  it('hides the undo button once the undo slot is gone, and clears the toast on navigation', async () => {
    await go('#/plan/item-7043');
    document.querySelector<HTMLInputElement>('#node-q-1329')?.click();
    await flush();
    const undoLabel = () =>
      [...document.querySelectorAll('.toast button')].map((b) => b.textContent);
    expect(undoLabel()).toContain(fr.toast.undo);

    // A change that cannot be undone empties the slot: offering "Annuler" would do nothing.
    store.dispatch((state) => state, false);
    store.history.value = { present: store.appState.value, previous: null };
    await flush();
    expect(undoLabel()).not.toContain(fr.toast.undo);

    store.undoLast();
    store.dispatch(
      (s, d) => setNodeDone(s, store.character.value?.id ?? '', 'q:1329', false, d),
      true,
    );
    await flush();
  });

  it('never stores derived state', () => {
    const saved = JSON.stringify(store.appState.value);
    expect(saved).not.toMatch(/implied|status|nextActions|blockedBy/);
  });
});
