/** The service worker is plain JS served as is: load it in a sandbox and test its pure routing. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type Strategy = 'ignore' | 'network-first' | 'cache-first';

const source = readFileSync(path.join('public', 'sw.js'), 'utf8');
const listeners: string[] = [];
const self = {
  addEventListener: (name: string) => listeners.push(name),
  strategyFor: undefined as unknown as (url: string, origin: string, mode: string) => Strategy,
  assetUrlsFrom: undefined as unknown as (html: string) => string[],
};
vm.runInNewContext(source, { self, URL, caches: {}, fetch: () => undefined });

const ORIGIN = 'https://example.github.io';
const at = (p: string): string => `${ORIGIN}/dofushelper/${p}`;

describe('service worker routing', () => {
  it('registers the three lifecycle listeners', () => {
    expect(listeners).toEqual(['install', 'activate', 'fetch']);
  });

  it('never touches another origin', () => {
    expect(self.strategyFor('https://api.dofusdb.fr/quests', ORIGIN, 'cors')).toBe('ignore');
    expect(self.strategyFor('https://dofusdb.fr/', ORIGIN, 'navigate')).toBe('ignore');
    expect(self.strategyFor('not a url', ORIGIN, 'cors')).toBe('ignore');
  });

  it('serves navigations and the data manifest network first, so a new deploy shows up at once', () => {
    expect(self.strategyFor(at(''), ORIGIN, 'navigate')).toBe('network-first');
    expect(self.strategyFor(at('data/manifest.json'), ORIGIN, 'cors')).toBe('network-first');
  });

  it('serves hashed files cache first', () => {
    expect(self.strategyFor(at('assets/index-vooUuUAh.js'), ORIGIN, 'no-cors')).toBe('cache-first');
    expect(self.strategyFor(at('assets/index-DHcvsOO_.css'), ORIGIN, 'no-cors')).toBe(
      'cache-first',
    );
    expect(self.strategyFor(at('data/quests.json?v=0123456789ab'), ORIGIN, 'cors')).toBe(
      'cache-first',
    );
  });

  it('does not cache-first an unversioned data file', () => {
    expect(self.strategyFor(at('data/quests.json'), ORIGIN, 'cors')).toBe('network-first');
    expect(self.strategyFor(at('icon.svg'), ORIGIN, 'no-cors')).toBe('network-first');
  });
});

describe('shell precache', () => {
  /**
   * Without this, the page and its assets only enter the cache on the SECOND visit, because
   * they load before the worker is active — a first visit then an offline reload would fail.
   */
  it('reads the hashed assets out of the served HTML', () => {
    const html = readFileSync(path.join('dist', 'index.html'), 'utf8');
    const urls = self.assetUrlsFrom(html);
    expect(urls.some((u) => /\/assets\/index-[\w-]+\.js$/.test(u))).toBe(true);
    expect(urls.some((u) => /\/assets\/index-[\w-]+\.css$/.test(u))).toBe(true);
    expect(urls.some((u) => u.endsWith('.webmanifest'))).toBe(true);
    expect(urls.some((u) => u.endsWith('icon.svg'))).toBe(true);
  });

  it('ignores links that are not part of the shell', () => {
    const urls = self.assetUrlsFrom(
      '<a href="https://dofusdb.fr">x</a><a href="#/objectifs">y</a><script src="/dofushelper/assets/app-A1b2C3d4.js"></script>',
    );
    expect(urls).toEqual(['/dofushelper/assets/app-A1b2C3d4.js']);
  });
});

describe('cache matching', () => {
  /**
   * Regression: the server sends `Vary: Origin`. A file fetched by the worker and the same file
   * requested by the page carry different `Origin` headers, so without `ignoreVary` nothing
   * precached is ever matched and the whole site fails offline (verified in a real browser).
   */
  function sandboxWithCache(hit: unknown) {
    const seen: { options: Record<string, unknown> | undefined }[] = [];
    const fakeCache = {
      match: (_request: unknown, options?: Record<string, unknown>) => {
        seen.push({ options });
        return Promise.resolve(hit);
      },
      put: () => Promise.resolve(),
    };
    const sandboxSelf = {
      addEventListener: () => undefined,
      location: { origin: ORIGIN },
    } as Record<string, unknown>;
    vm.runInNewContext(source, {
      self: sandboxSelf,
      URL,
      Response,
      caches: { open: () => Promise.resolve(fakeCache) },
      fetch: () => Promise.reject(new Error('offline')),
    });
    return { seen, sandboxSelf };
  }

  it('asks the cache to ignore Vary, in both strategies', async () => {
    const cached = { status: 200 };
    const { seen, sandboxSelf } = sandboxWithCache(cached);
    const request = { url: at('assets/index-abcdef12.js'), mode: 'cors' };

    const first = await (sandboxSelf.cacheFirst as (r: unknown) => Promise<unknown>)(request);
    expect(first).toBe(cached);
    expect(seen[0]?.options).toMatchObject({ ignoreVary: true });

    // networkFirst falls back to the cache only when the network fails, as it does offline.
    const second = await (sandboxSelf.networkFirst as (r: unknown) => Promise<unknown>)(request);
    expect(second).toBe(cached);
    expect(seen[1]?.options).toMatchObject({ ignoreVary: true });
  });

  it('matches a navigation whatever its query string', async () => {
    const { seen, sandboxSelf } = sandboxWithCache({ status: 200 });
    await (sandboxSelf.networkFirst as (r: unknown) => Promise<unknown>)({
      url: at(''),
      mode: 'navigate',
    });
    expect(seen[0]?.options).toMatchObject({ ignoreVary: true, ignoreSearch: true });
  });
});
