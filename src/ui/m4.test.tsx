// @vitest-environment happy-dom
/** M4 screens in a simulated DOM, on the real "Dofus des Glaces" fixture: search, catalog tabs, bulk entry. */
import { render } from 'preact';
import { beforeAll, describe, expect, it } from 'vitest';
import fixture from '../../tests/fixtures/item-7043-dofus-des-glaces.json';
import { DATASET_FORMAT } from '../core/dataset';
import { createCharacter } from '../state/actions';
import { parseRoute } from './router';
import { fr } from './strings.fr';

const FILES = ['quests', 'achievements', 'items', 'monsters', 'dungeons', 'goals', 'refs'] as const;

globalThis.fetch = ((input: string) => {
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

function type(selector: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`no element for ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function choose(select: HTMLSelectElement | undefined, value: string): void {
  if (!select) throw new Error('select not found');
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('M4 screens', () => {
  let store: typeof import('./store');

  beforeAll(async () => {
    window.localStorage.clear();
    store = await import('./store');
    const { App } = await import('./App');
    await store.loadData();
    store.dispatch((state, deps) =>
      createCharacter(state, { name: 'FAKE Iop', alignment: 1 }, deps),
    );
    render(<App />, document.body);
    await flush();
  });

  const go = async (hash: string): Promise<void> => {
    store.route.value = parseRoute(hash);
    await flush();
  };

  it('global search finds quests, achievements and Dofus, and links to sheets and plans', async () => {
    await go('#/recherche');
    expect(text()).toContain(fr.search.hint);
    type('input[type=search]', 'glaces');
    await flush();
    expect(text()).toContain(fr.search.kinds.goal);
    expect(text()).toContain(fr.search.kinds.quest);
    const hrefs = [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('#/plan/item-7043');
    expect(hrefs).toContain('#/fiche/q-1329');

    type('input[type=search]', 'zzzz introuvable');
    await flush();
    expect(text()).toContain(fr.search.none);
  });

  it('catalog: a quest goal can be followed and shows up on the home page', async () => {
    await go('#/objectifs');
    const questTab = [...document.querySelectorAll<HTMLButtonElement>('.tab')].find(
      (b) => b.textContent === fr.catalog.tabs.quest,
    );
    questTab?.click();
    await flush();
    expect(text()).toContain(fr.catalog.typeToSearch);

    type('input[type=search]', 'dofus des glaces');
    await flush();
    const follow = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent === fr.catalog.follow,
    );
    follow?.click();
    await flush();
    expect(store.character.value?.goals).toEqual([{ t: 'quest', id: 1329 }]);

    await go('#/');
    expect(text()).toContain('Le Dofus des Glaces');
    await go('#/plan/quest-1329');
    expect(document.querySelectorAll('.step__check').length).toBeGreaterThan(28);
  });

  it('bulk entry: ticking a whole category is one undoable action', async () => {
    await go('#/saisie');
    const selects = [...document.querySelectorAll<HTMLSelectElement>('select.select')];
    const category = selects.at(-1);
    const frigost = [...(category?.options ?? [])].find((o) =>
      o.textContent?.startsWith('Île de Frigost'),
    );
    expect(frigost).toBeDefined();
    choose(category, frigost?.value ?? '');
    await flush();

    const before = store.character.value?.doneQuests.length ?? 0;
    const tickAll = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.startsWith('Tout cocher'),
    );
    expect(tickAll?.disabled).toBe(false);
    tickAll?.click();
    await flush();

    const after = store.character.value?.doneQuests.length ?? 0;
    expect(after).toBeGreaterThan(before + 10);
    expect(store.toast.value?.undoable).toBe(true);
    expect(store.toast.value?.message).toMatch(/étapes cochées/);
    expect(
      [...document.querySelectorAll<HTMLInputElement>('.step__check')].every((box) => box.checked),
    ).toBe(true);

    store.undoLast();
    await flush();
    expect(store.character.value?.doneQuests.length).toBe(before);
  });
});
