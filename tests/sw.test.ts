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
