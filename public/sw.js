/*
 * Roadbook service worker — offline support, written by hand, no dependency (SPEC §11).
 * Same-origin GET requests only: the site never talks to a third party (golden rule 3).
 *
 *   navigation            → network first, cache as a fallback (a new deploy is picked up at once)
 *   data/manifest.json    → network first, cache as a fallback
 *   hashed files          → cache first (assets/<name>-<hash>.*, data/<file>.json?v=<hash>)
 *   anything else         → network first, cache as a fallback
 */
const CACHE = 'roadbook-v1';

/** Pure: which strategy applies to a request. Exported for tests through `self`. */
function strategyFor(url, scopeOrigin, mode) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'ignore';
  }
  if (parsed.origin !== scopeOrigin) return 'ignore';
  if (mode === 'navigate') return 'network-first';
  if (/\/data\/manifest\.json$/.test(parsed.pathname)) return 'network-first';
  if (/\/assets\/[^/]+-[\w-]{6,}\.\w+$/.test(parsed.pathname)) return 'cache-first';
  if (/\/data\/[\w-]+\.json$/.test(parsed.pathname) && parsed.searchParams.has('v'))
    return 'cache-first';
  return 'network-first';
}

self.strategyFor = strategyFor;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (hit) return hit;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const strategy = strategyFor(request.url, self.location.origin, request.mode);
  if (strategy === 'ignore') return;
  event.respondWith(strategy === 'cache-first' ? cacheFirst(request) : networkFirst(request));
});
