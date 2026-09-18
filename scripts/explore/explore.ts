/**
 * M1-1 — Throwaway exploration of the DofusDB API (read-only, 60 requests max).
 * See scripts/explore/plan.md for the request list and docs/DATA_NOTES.md for the findings.
 *
 * Usage: npx tsx scripts/explore/explore.ts [--offline]
 *   --offline : only replay the disk cache, never touch the network.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://api.dofusdb.fr';
const MAX_REQUESTS = 60;
const MIN_DELAY_MS = 500;
const CACHE_DIR = path.join('data', 'raw', '_explore');
const REPO = 'https://github.com/devmarcpro/dofushelper';
const HEADERS = {
  'User-Agent': `Roadbook/0.1 (projet fan non commercial ; +${REPO} ; contact ${REPO}/issues)`,
  Referer: REPO,
  Accept: 'application/json',
};

const offline = process.argv.includes('--offline');

interface Cached {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  fetchedAt: string;
}

class Stop extends Error {}

let requestCount = 0;
let serverErrors = 0;
let lastRequestAt = 0;
const log: string[] = [];

function cacheFile(url: string): string {
  const name = url
    .replace(BASE, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .slice(0, 180);
  return path.join(CACHE_DIR, `${name}.json`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function get(route: string, params: Record<string, string | string[]> = {}): Promise<Cached> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const v of value) search.append(key, v);
    else search.append(key, value);
  }
  const query = search.toString();
  const url = `${BASE}${route}${query ? `?${query}` : ''}`;
  const file = cacheFile(url);

  try {
    const cached = JSON.parse(await readFile(file, 'utf8')) as Cached;
    log.push(`cache  ${url}`);
    return cached;
  } catch {
    // not cached
  }

  if (offline) throw new Stop(`offline: ${url} is not cached`);
  if (requestCount >= MAX_REQUESTS) throw new Stop(`budget of ${MAX_REQUESTS} requests reached`);

  const wait = MIN_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  requestCount += 1;

  const response = await fetch(url, { headers: HEADERS });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }
  const cached: Cached = {
    url,
    status: response.status,
    headers,
    body,
    fetchedAt: new Date().toISOString(),
  };
  await writeFile(file, JSON.stringify(cached, null, 2));
  const line = `#${String(requestCount).padStart(2, '0')} ${response.status} ${url}`;
  log.push(line);
  console.log(line);

  if (response.status === 429) throw new Stop('429 received: stopping as agreed');
  if (response.status >= 500) {
    serverErrors += 1;
    if (serverErrors >= 2) throw new Stop('second 5xx received: stopping as agreed');
  }
  return cached;
}

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {});
const asList = (v: unknown): Obj[] =>
  Array.isArray(asObj(v).data) ? (asObj(v).data as Obj[]) : [];
const total = (v: unknown): number | undefined =>
  typeof asObj(v).total === 'number' ? (asObj(v).total as number) : undefined;
const idOf = (o: Obj | undefined): number | undefined =>
  typeof o?.id === 'number' ? (o.id as number) : undefined;

async function run(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });

  // Q1 — version
  await get('/version');

  // Q2 — pagination
  await get('/quests', { $limit: '100', '$select[]': 'id' });
  await get('/quests', { $limit: '0' });

  // Q3 — quest 1329, quest list fields
  const quest1329 = await get('/quests/1329');
  await get('/quests', {
    $limit: '3',
    '$select[]': [
      'id',
      'name',
      'startCriterion',
      'stepIds',
      'categoryId',
      'repeatType',
      'isPartyQuest',
      'followable',
      'levelMin',
      'levelMax',
      'isDungeonQuest',
    ],
  });

  // Q3 — steps, objectives, rewards
  await get('/quest-steps', { $limit: '1' });
  const steps1329 = await get('/quest-steps', { questId: '1329', $limit: '50' });
  const firstStepId = idOf(asList(steps1329.body)[0]);

  await get('/quest-objectives', { $limit: '1' });
  let objectives1329: Obj[] = [];
  if (firstStepId !== undefined) {
    const r = await get('/quest-objectives', { stepId: String(firstStepId), $limit: '10' });
    objectives1329 = asList(r.body);
  }

  await get('/quest-step-rewards', { $limit: '3' });
  if (firstStepId !== undefined) {
    await get('/quest-step-rewards', { stepId: String(firstStepId), $limit: '10' });
  }

  // Q4 — objective types (full list allowed), quest categories
  const types = await get('/quest-objective-types', { $limit: '50' });
  const typesTotal = total(types.body);
  if (typesTotal !== undefined && typesTotal > 50) {
    await get('/quest-objective-types', { $limit: '50', $skip: '50' });
  }
  const categories = await get('/quest-categories', { $limit: '50' });
  const categoriesTotal = total(categories.body);
  if (categoriesTotal !== undefined && categoriesTotal > 50) {
    await get('/quest-categories', { $limit: '50', $skip: '50' });
  }

  // Q4 — where are the parameters per objective type: 2 objectives for each of the first 8 types
  const typeIds = asList(types.body)
    .map(idOf)
    .filter((id): id is number => id !== undefined)
    .slice(0, 8);
  for (const typeId of typeIds) {
    await get('/quest-objectives', { typeId: String(typeId), $limit: '2' });
  }

  // Q6 — item type "Dofus", super types, Dofus items
  const dofusType = await get('/item-types', { 'name.fr': 'Dofus', $limit: '5' });
  await get('/item-super-types', { $limit: '50' });
  const dofusTypeId = idOf(asList(dofusType.body)[0]);
  let firstDofusId: number | undefined;
  if (dofusTypeId !== undefined) {
    await get('/items', { typeId: String(dofusTypeId), $limit: '0' });
    const dofusItems = await get('/items', {
      typeId: String(dofusTypeId),
      $limit: '50',
      '$select[]': ['id', 'name', 'level', 'questsThatReward', 'typeId'],
    });
    const dofusTotal = total(dofusItems.body);
    if (dofusTotal !== undefined && dofusTotal > 50) {
      await get('/items', {
        typeId: String(dofusTypeId),
        $limit: '50',
        $skip: '50',
        '$select[]': ['id', 'name', 'level', 'questsThatReward', 'typeId'],
      });
    }
    firstDofusId = idOf(asList(dofusItems.body)[0]);
  }
  if (firstDofusId !== undefined) await get(`/items/${firstDofusId}`);

  // Q7 — achievements
  await get('/achievements', { $limit: '3' });
  await get('/achievements', { $limit: '0' });
  await get('/achievement-objectives', { $limit: '3' });
  await get('/achievement-objectives', { $limit: '0' });
  await get('/achievement-rewards', { $limit: '2' });
  await get('/achievement-categories', { $limit: '3' });

  // Q8 — monsters and dungeons
  await get('/monsters', { $limit: '2' });
  const dungeons = await get('/dungeons', { $limit: '2' });
  const firstDungeon = asList(dungeons.body)[0];
  const dungeonMonsters = Array.isArray(firstDungeon?.monsters)
    ? (firstDungeon.monsters as unknown[])
    : [];
  const monsterIds = dungeonMonsters
    .map((m) => (typeof m === 'number' ? m : idOf(asObj(m))))
    .filter((id): id is number => id !== undefined)
    .slice(0, 10);
  if (monsterIds.length > 0) {
    await get('/monsters', { 'id[$in][]': monsterIds.map(String), $limit: '10' });
  }
  await get('/monsters', { isBoss: 'true', $limit: '2' });

  // Q9 — readable criterion
  await get(`/criterion/${encodeURIComponent('PL>29&PJ>26,79&PZ=1')}`, { lang: 'fr' });
  await get(`/criterion/${encodeURIComponent('PL>99&(PO!11267|DD>6,11267)')}`, { lang: 'fr' });

  // Reference tables
  await get('/jobs', { $limit: '3' });
  await get('/breeds', { $limit: '2' });
  await get('/alignment-sides', { $limit: '5' });
  await get('/npcs', { $limit: '1' });
  await get('/recipes', { $limit: '1' });

  // Q3 — an item referenced by an objective of quest 1329, if any parameter looks like an item id
  const firstObjective = objectives1329[0];
  const params = firstObjective?.parameters;
  const candidate = asObj(params);
  const itemId = [candidate.parameter0, candidate.parameter1, candidate.itemId].find(
    (v): v is number => typeof v === 'number' && v > 0,
  );
  void quest1329;
  if (itemId !== undefined) await get(`/items/${itemId}`);

  // Extra (after first analysis): sources of Dofus items are mostly achievements, not quests.
  if (process.argv.includes('--extra') && dofusTypeId !== undefined) {
    await get('/items', {
      typeId: String(dofusTypeId),
      $limit: '50',
      '$select[]': ['id', 'name', 'questsThatReward', 'achievementsThatReward', 'questsThatUse'],
    });
    await get('/items/7043');
    await get('/achievements/1101');
  }

  // Extra 2: remaining objective types with parameters, the achievement giving the Ice Dofus, license text.
  if (process.argv.includes('--extra2')) {
    for (const typeId of [8, 9, 12, 13, 14, 16, 17]) {
      await get('/quest-objectives', { typeId: String(typeId), $limit: '2' });
    }
    await get('/achievements/922');
    await get('/');
  }
}

run()
  .catch((error: unknown) => {
    if (error instanceof Stop) console.error(`STOP: ${error.message}`);
    else console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    console.log(`\nrequests sent this run: ${requestCount} / ${MAX_REQUESTS}`);
    await writeFile(path.join(CACHE_DIR, '_log.txt'), `${log.join('\n')}\n`);
  });
