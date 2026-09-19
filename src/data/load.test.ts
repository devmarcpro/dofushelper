import { describe, expect, it } from 'vitest';
import { DATASET_FORMAT } from '../core/dataset';
import { loadDataset } from './load';

const FILES = ['quests', 'achievements', 'items', 'monsters', 'dungeons', 'goals', 'refs'];

function manifest(format: number = DATASET_FORMAT) {
  return {
    format,
    gameVersion: 'FAKE-1.0',
    lang: 'fr',
    builtAt: '2026-01-01T00:00:00.000Z',
    attribution: 'FAKE',
    files: FILES.map((name) => ({
      file: `${name}.json`,
      bytes: 2,
      sha256: `${name}0123456789abcdef`,
    })),
  };
}

function fakeFetch(overrides: Record<string, unknown> = {}, failing: Record<string, number> = {}) {
  const calls: { url: string; cache: string | undefined }[] = [];
  const fetchFn = (url: string, init?: { cache?: 'no-cache' | 'default' }) => {
    calls.push({ url, cache: init?.cache });
    const file = url.split('/').pop()?.split('?')[0] ?? '';
    const status = failing[file];
    if (status !== undefined)
      return Promise.resolve({ ok: false, status, json: () => Promise.resolve(null) });
    const body =
      file in overrides
        ? overrides[file]
        : file === 'manifest.json'
          ? manifest()
          : file === 'refs.json'
            ? {}
            : [];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  };
  return { fetchFn, calls };
}

describe('loadDataset', () => {
  it('loads the manifest fresh, then every file with its content hash, under the base path', async () => {
    const { fetchFn, calls } = fakeFetch();
    const result = await loadDataset(fetchFn, '/dofushelper/');
    expect(result.ok).toBe(true);
    expect(calls[0]).toEqual({ url: '/dofushelper/data/manifest.json', cache: 'no-cache' });
    expect(calls.slice(1).map((c) => c.url)).toContain(
      '/dofushelper/data/quests.json?v=quests012345',
    );
    expect(calls.every((c) => c.url.startsWith('/dofushelper/data/'))).toBe(true);
    expect(result.ok && result.value.manifest.gameVersion).toBe('FAKE-1.0');
  });

  it('refuses a dataset of another format', async () => {
    const { fetchFn } = fakeFetch({ 'manifest.json': manifest(0) });
    expect(await loadDataset(fetchFn, '/')).toEqual({
      ok: false,
      error: { t: 'format', found: 0, expected: DATASET_FORMAT },
    });
  });

  it('reports a missing file with its HTTP status', async () => {
    const { fetchFn } = fakeFetch({}, { 'items.json': 404 });
    expect(await loadDataset(fetchFn, '/')).toEqual({
      ok: false,
      error: { t: 'network', file: 'items.json', status: 404 },
    });
  });

  it('reports a network failure without throwing', async () => {
    const result = await loadDataset(() => Promise.reject(new Error('offline')), '/');
    expect(result).toEqual({
      ok: false,
      error: { t: 'network', file: 'manifest.json', status: null },
    });
  });

  it('rejects unexpected shapes', async () => {
    expect(
      (await loadDataset(fakeFetch({ 'manifest.json': { files: 'x' } }).fetchFn, '/')).ok,
    ).toBe(false);
    expect(await loadDataset(fakeFetch({ 'quests.json': {} }).fetchFn, '/')).toEqual({
      ok: false,
      error: { t: 'invalid', file: 'quests.json', reason: 'tableau attendu' },
    });
  });
});
