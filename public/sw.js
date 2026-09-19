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

/**
 * Pure: the shell files to precache, read from the served HTML. The asset names carry a build
 * hash, so they cannot be hard-coded here. Exported through `self` for tests.
 */
function assetUrlsFrom(html) {
  const found = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = match[1];
    if (/\/assets\/[^/"]+-[\w-]{6,}\.\w+$/.test(url) || /\.webmanifest$|\/icon\.svg$/.test(url)) {
      found.add(url);
    }
  }
  return [...found];
}

self.strategyFor = strategyFor;
self.assetUrlsFrom = assetUrlsFrom;

/**
 * The page and its assets load BEFORE the worker is active, so without this they would only
 * enter the cache on the second visit — and a first visit followed by an offline reload would
 * fail. Fetch the shell once at install instead.
 */
async function precacheShell() {
  const cache = await caches.open(CACHE);
  const root = new URL('./', self.registration.scope);
  const put = async (url, init) => {
    try {
      const response = await fetch(url, init);
      if (response.ok) await cache.put(url, response);
    } catch {
      // one missing file must not fail the whole install
    }
  };

  try {
    const response = await fetch(root, { cache: 'reload' });
    if (!response.ok) return;
    const html = await response.text();
    await cache.put(root, new Response(html, { headers: response.headers, status: 200 }));
    await Promise.all(
      assetUrlsFrom(html).map((url) => put(new URL(url, root), { cache: 'reload' })),
    );
  } catch {
    // offline while installing: the cache fills up on the first successful fetch
    return;
  }

  // The dataset is loaded by the page before this worker is active, so it would otherwise stay
  // out of the cache until the second visit. The browser HTTP cache makes these near-free.
  try {
    const manifestUrl = new URL('data/manifest.json', root);
    const manifest = await (await fetch(manifestUrl, { cache: 'reload' })).json();
    await cache.put(
      manifestUrl,
      new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const files = Array.isArray(manifest?.files) ? manifest.files : [];
    await Promise.all(
      files.map((entry) =>
        typeof entry?.file === 'string' && typeof entry?.sha256 === 'string'
          ? put(new URL(`data/${entry.file}?v=${entry.sha256.slice(0, 12)}`, root))
          : undefined,
      ),
    );
  } catch {
    // no dataset yet, or offline: the site still works online
  }
}

self.addEventListener('install', (event) => {
  // Claim the page as early as possible; the precache keeps filling in the background.
  self.skipWaiting();
  event.waitUntil(precacheShell());
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

/*
 * `ignoreVary` is required: the server sends `Vary: Origin`, and a file fetched by this worker
 * carries a different `Origin` than the same file requested by the page. Without it, nothing
 * precached is ever matched and the site fails offline. The files are content-hashed, so the
 * request headers cannot change what they contain.
 */
const MATCH = { ignoreVary: true };

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, MATCH);
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
    const hit = await cache.match(request, { ...MATCH, ignoreSearch: request.mode === 'navigate' });
    if (hit) return hit;
    throw error;
  }
}

self.cacheFirst = cacheFirst;
self.networkFirst = networkFirst;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const strategy = strategyFor(request.url, self.location.origin, request.mode);
  if (strategy === 'ignore') return;
  event.respondWith(strategy === 'cache-first' ? cacheFirst(request) : networkFirst(request));
});
