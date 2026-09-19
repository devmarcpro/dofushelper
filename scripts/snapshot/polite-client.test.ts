import { describe, expect, it } from 'vitest';
import {
  createPoliteClient,
  type CacheStore,
  type FetchLike,
  type HttpResponseLike,
} from './polite-client';

/** Fake world: a manual clock, a sleep that advances it, a scripted fetch. No network, ever. */
function makeWorld(script: (HttpResponseLike | Error)[]) {
  let time = 0;
  const calls: { url: string; at: number; headers: Record<string, string> }[] = [];
  const sleeps: number[] = [];
  const queue = [...script];
  const fetch: FetchLike = (url, init) => {
    calls.push({ url, at: time, headers: init.headers });
    const next = queue.shift();
    if (next === undefined) return Promise.reject(new Error('script exhausted'));
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  };
  const store = new Map<string, string>();
  const cache: CacheStore = {
    read: (url) => Promise.resolve(store.get(url)),
    write: (url, body) => {
      store.set(url, body);
      return Promise.resolve();
    },
  };
  return {
    calls,
    sleeps,
    store,
    deps: {
      fetch,
      cache,
      now: () => time,
      sleep: (ms: number) => {
        sleeps.push(ms);
        time += ms;
        return Promise.resolve();
      },
    },
  };
}

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } satisfies HttpResponseLike;
}

const HEADERS = { 'User-Agent': 'test' };

describe('polite client', () => {
  it('sends the identification headers', async () => {
    const world = makeWorld([response(200, { ok: true })]);
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    await client.getJson('https://x/a');
    expect(world.calls[0]?.headers).toEqual(HEADERS);
  });

  it('keeps at least minDelayMs between two network requests', async () => {
    const world = makeWorld([response(200, 1), response(200, 2), response(200, 3)]);
    const client = createPoliteClient(world.deps, { headers: HEADERS, minDelayMs: 250 });
    await client.getJson('https://x/a');
    await client.getJson('https://x/b');
    await client.getJson('https://x/c');
    expect(world.calls.map((c) => c.at)).toEqual([0, 250, 500]);
    expect(client.stats()).toEqual({ requests: 3, cacheHits: 0, retries: 0 });
  });

  it('retries after a 429 with exponential backoff, then succeeds', async () => {
    const world = makeWorld([response(429, ''), response(503, ''), response(200, { v: 1 })]);
    const client = createPoliteClient(world.deps, { headers: HEADERS, backoffBaseMs: 1000 });
    const result = await client.getJson('https://x/a');
    expect(result).toEqual({ ok: true, value: { v: 1 } });
    expect(world.sleeps).toEqual([1000, 2000]);
    expect(client.stats()).toEqual({ requests: 3, cacheHits: 0, retries: 2 });
  });

  it('honours Retry-After when it is longer than the backoff', async () => {
    const world = makeWorld([response(429, '', { 'retry-after': '7' }), response(200, 1)]);
    const client = createPoliteClient(world.deps, { headers: HEADERS, backoffBaseMs: 1000 });
    await client.getJson('https://x/a');
    expect(world.sleeps).toEqual([7000]);
  });

  it('stops cleanly after 5 consecutive failures', async () => {
    const world = makeWorld([
      response(500, ''),
      new Error('ECONNRESET'),
      response(429, ''),
      response(502, ''),
      response(500, ''),
      response(200, 'never reached'),
    ]);
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    const result = await client.getJson('https://x/a');
    expect(result).toEqual({
      ok: false,
      error: { t: 'aborted', failures: 5, lastStatus: 500, url: 'https://x/a' },
    });
    expect(world.calls).toHaveLength(5);
  });

  it('resets the failure counter after a success', async () => {
    const world = makeWorld([
      response(500, ''),
      response(200, 1),
      response(500, ''),
      response(500, ''),
      response(500, ''),
      response(500, ''),
      response(200, 2),
    ]);
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    expect((await client.getJson('https://x/a')).ok).toBe(true);
    expect((await client.getJson('https://x/b')).ok).toBe(true);
  });

  it('does not retry nor cache a 404', async () => {
    const world = makeWorld([response(404, { message: 'not found' })]);
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    const result = await client.getJson('https://x/missing');
    expect(result).toEqual({
      ok: false,
      error: { t: 'http', status: 404, url: 'https://x/missing' },
    });
    expect(world.calls).toHaveLength(1);
    expect(world.store.size).toBe(0);
  });

  it('reports invalid JSON without caching it', async () => {
    const world = makeWorld([response(200, '<html>')]);
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    const result = await client.getJson('https://x/a');
    expect(result).toEqual({ ok: false, error: { t: 'invalidJson', url: 'https://x/a' } });
    expect(world.store.size).toBe(0);
  });

  it('serves a relaunch entirely from the cache', async () => {
    const world = makeWorld([response(200, { page: 1 }), response(200, { page: 2 })]);
    const first = createPoliteClient(world.deps, { headers: HEADERS });
    await first.getJson('https://x/p1');
    await first.getJson('https://x/p2');

    const second = createPoliteClient(world.deps, { headers: HEADERS });
    expect(await second.getJson('https://x/p1')).toEqual({ ok: true, value: { page: 1 } });
    expect(await second.getJson('https://x/p2')).toEqual({ ok: true, value: { page: 2 } });
    expect(second.stats()).toEqual({ requests: 0, cacheHits: 2, retries: 0 });
    expect(world.calls).toHaveLength(2);
  });

  it('bypasses the cache when asked to (used for /version)', async () => {
    const world = makeWorld([response(200, '"3.6.11.15"'), response(200, '"3.6.12.1"')]);
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    expect(await client.getJson('https://x/version', { cache: false })).toEqual({
      ok: true,
      value: '3.6.11.15',
    });
    expect(await client.getJson('https://x/version', { cache: false })).toEqual({
      ok: true,
      value: '3.6.12.1',
    });
    expect(world.store.size).toBe(0);
  });

  it('refuses to exceed the request budget', async () => {
    const world = makeWorld([response(200, 1), response(200, 2), response(200, 3)]);
    const client = createPoliteClient(world.deps, { headers: HEADERS, maxRequests: 2 });
    await client.getJson('https://x/a');
    await client.getJson('https://x/b');
    expect(await client.getJson('https://x/c')).toEqual({
      ok: false,
      error: { t: 'budget', max: 2, url: 'https://x/c' },
    });
    expect(world.calls).toHaveLength(2);
  });

  it('refetches when a cache entry is corrupted', async () => {
    const world = makeWorld([response(200, { fresh: true })]);
    world.store.set('https://x/a', '{truncated');
    const client = createPoliteClient(world.deps, { headers: HEADERS });
    expect(await client.getJson('https://x/a')).toEqual({ ok: true, value: { fresh: true } });
    expect(world.store.get('https://x/a')).toBe('{"fresh":true}');
  });
});
