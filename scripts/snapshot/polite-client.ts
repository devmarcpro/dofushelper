/**
 * Polite HTTP client for the DofusDB snapshot (DATA_SOURCES.md §3).
 * One request at a time, minimum delay between requests, exponential backoff on 429/5xx,
 * clean stop after N consecutive failures, disk cache so that an interrupted run resumes.
 * Everything that touches the outside world (fetch, clock, sleep, cache) is injected.
 */
import { err, ok, type Result } from '../../src/core/result';

export interface HttpResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<HttpResponseLike>;

export interface CacheStore {
  read(url: string): Promise<string | undefined>;
  write(url: string, body: string): Promise<void>;
}

export interface PoliteClientDeps {
  fetch: FetchLike;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  cache: CacheStore;
  log?: (line: string) => void;
}

export interface PoliteClientOptions {
  headers: Record<string, string>;
  /** Minimum time between the start of two network requests. Default 250 ms. */
  minDelayMs?: number;
  /** Consecutive failures (429, 5xx, network error) before giving up. Default 5. */
  maxConsecutiveFailures?: number;
  /** First backoff wait; doubles at each consecutive failure. Default 1000 ms. */
  backoffBaseMs?: number;
  /** Upper bound of a single backoff wait. Default 60 000 ms. */
  backoffMaxMs?: number;
  /** Hard budget of network requests for the whole run. Default 2000. */
  maxRequests?: number;
}

export type ClientError =
  | { t: 'budget'; max: number; url: string }
  | { t: 'aborted'; failures: number; lastStatus: number | null; url: string }
  | { t: 'http'; status: number; url: string }
  | { t: 'invalidJson'; url: string };

export interface ClientStats {
  requests: number;
  cacheHits: number;
  retries: number;
}

export interface GetOptions {
  /** When false the cache is neither read nor written (used for /version). Default true. */
  cache?: boolean;
}

export interface PoliteClient {
  getJson(url: string, options?: GetOptions): Promise<Result<unknown, ClientError>>;
  stats(): ClientStats;
}

function parseJson(text: string): Result<unknown, null> {
  try {
    return ok(JSON.parse(text) as unknown);
  } catch {
    return err(null);
  }
}

export function createPoliteClient(
  deps: PoliteClientDeps,
  options: PoliteClientOptions,
): PoliteClient {
  const minDelayMs = options.minDelayMs ?? 250;
  const maxConsecutiveFailures = options.maxConsecutiveFailures ?? 5;
  const backoffBaseMs = options.backoffBaseMs ?? 1000;
  const backoffMaxMs = options.backoffMaxMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 2000;
  const log = deps.log ?? (() => undefined);

  const stats: ClientStats = { requests: 0, cacheHits: 0, retries: 0 };
  let lastRequestAt: number | null = null;
  let consecutiveFailures = 0;

  async function waitForSlot(): Promise<void> {
    if (lastRequestAt === null) return;
    const wait = lastRequestAt + minDelayMs - deps.now();
    if (wait > 0) await deps.sleep(wait);
  }

  async function getJson(
    url: string,
    getOptions: GetOptions = {},
  ): Promise<Result<unknown, ClientError>> {
    const useCache = getOptions.cache ?? true;

    if (useCache) {
      const cached = await deps.cache.read(url);
      if (cached !== undefined) {
        const parsed = parseJson(cached);
        if (parsed.ok) {
          stats.cacheHits += 1;
          return ok(parsed.value);
        }
        log(`cache entry unreadable, refetching: ${url}`);
      }
    }

    for (;;) {
      if (stats.requests >= maxRequests) return err({ t: 'budget', max: maxRequests, url });

      await waitForSlot();
      lastRequestAt = deps.now();
      stats.requests += 1;

      let status: number | null;
      let retryAfterMs = 0;
      let body: string | null = null;
      try {
        const response = await deps.fetch(url, { headers: options.headers });
        status = response.status;
        const retryAfter = Number(response.headers.get('retry-after'));
        if (Number.isFinite(retryAfter) && retryAfter > 0) retryAfterMs = retryAfter * 1000;
        body = await response.text();
      } catch {
        status = null;
      }

      const retryable = status === null || status === 429 || status >= 500;
      if (!retryable && status !== null) {
        consecutiveFailures = 0;
        if (status < 200 || status >= 300) return err({ t: 'http', status, url });
        const parsed = parseJson(body ?? '');
        if (!parsed.ok) return err({ t: 'invalidJson', url });
        if (useCache) await deps.cache.write(url, body ?? '');
        return ok(parsed.value);
      }

      consecutiveFailures += 1;
      if (consecutiveFailures >= maxConsecutiveFailures) {
        return err({ t: 'aborted', failures: consecutiveFailures, lastStatus: status, url });
      }
      stats.retries += 1;
      const backoff = Math.min(backoffMaxMs, backoffBaseMs * 2 ** (consecutiveFailures - 1));
      const wait = Math.max(backoff, retryAfterMs);
      log(
        `retry ${consecutiveFailures}/${maxConsecutiveFailures - 1} in ${wait} ms (status ${status ?? 'network error'}): ${url}`,
      );
      await deps.sleep(wait);
    }
  }

  return { getJson, stats: () => ({ ...stats }) };
}
