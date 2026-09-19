/**
 * npm run data:snapshot — DofusDB → data/raw/<gameVersion>/ (DATA_SOURCES.md §3 and §6).
 *
 * Options:
 *   --dry-run            count the planned requests per resource, download no data
 *   --refresh            rebuild a complete snapshot even if one exists (the disk cache is still used)
 *   --only a,b           restrict to these resources (phase A tables must already be cached for phase B)
 *   --max-requests <n>   request budget, default 2000; the script refuses to start beyond it
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DiskCache, cacheFileName } from './disk-cache';
import { createPoliteClient, type ClientError } from './polite-client';
import { PAGE_SIZE, buildListUrl, chunkIds, pageCount, type ListQuery } from './query';
import { collectFromItems, collectIngredients, collectReferences } from './refs';
import {
  ACHIEVEMENT_OBJECTIVE_SELECT,
  INGREDIENT_SELECT,
  ITEM_SELECT,
  MONSTER_SELECT,
  NPC_SELECT,
  PHASE_A_TABLES,
  PHASE_B_NAMES,
  RECIPE_SELECT,
  SUBAREA_SELECT,
} from './resources';

const BASE = 'https://api.dofusdb.fr';
const REPO = 'https://github.com/devmarcpro/dofushelper';
const HEADERS = {
  'User-Agent': `Roadbook/0.1 (projet fan non commercial ; +${REPO} ; contact ${REPO}/issues)`,
  Referer: REPO,
  Accept: 'application/json',
};
const RAW_DIR = path.join('data', 'raw');

interface ResourceReport {
  rows: number;
  pages: number;
  /** Cache files of this resource, in download order (read by data:build). */
  files: string[];
}

interface SnapshotManifest {
  gameVersion: string;
  startedAt: string;
  finishedAt: string;
  complete: boolean;
  requests: number;
  cacheHits: number;
  resources: Record<string, ResourceReport>;
}

class Halt extends Error {}

function parseArgs(argv: readonly string[]) {
  const dryRun = argv.includes('--dry-run');
  const refresh = argv.includes('--refresh');
  const onlyIndex = argv.indexOf('--only');
  const only = onlyIndex >= 0 ? (argv[onlyIndex + 1] ?? '').split(',').filter(Boolean) : null;
  const maxIndex = argv.indexOf('--max-requests');
  const maxRequests = maxIndex >= 0 ? Number(argv[maxIndex + 1]) : 2000;
  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    throw new Halt('--max-requests attend un entier positif');
  }
  return { dryRun, refresh, only, maxRequests };
}

function describeError(error: ClientError): string {
  switch (error.t) {
    case 'budget':
      return `budget de ${error.max} requêtes atteint avant ${error.url}`;
    case 'aborted':
      return `arrêt après ${error.failures} échecs consécutifs (dernier statut : ${error.lastStatus ?? 'erreur réseau'}) sur ${error.url}`;
    case 'http':
      return `HTTP ${error.status} sur ${error.url}`;
    case 'invalidJson':
      return `réponse non JSON sur ${error.url}`;
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  const cache = new DiskCache();
  const client = createPoliteClient(
    {
      fetch: (url, init) => fetch(url, init),
      now: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      cache,
      log: (line) => console.log(`  ! ${line}`),
    },
    { headers: HEADERS, minDelayMs: 250, maxRequests: args.maxRequests },
  );

  const wants = (name: string): boolean => args.only === null || args.only.includes(name);
  const resources: Record<string, ResourceReport> = {};

  async function getJson(url: string, useCache = true): Promise<unknown> {
    const result = await client.getJson(url, { cache: useCache });
    if (!result.ok) throw new Halt(describeError(result.error));
    return result.value;
  }

  // 1. Game version: the cache key of the whole snapshot. Never cached itself.
  const version = await getJson(`${BASE}/version`, false);
  if (typeof version !== 'string' || !/^[\w.-]+$/.test(version)) {
    throw new Halt(`version inattendue : ${JSON.stringify(version)}`);
  }
  const versionDir = path.join(RAW_DIR, version);
  // A partial run (--only) never overwrites the manifest of a complete snapshot.
  const manifestPath = path.join(versionDir, 'snapshot.json');
  const outputPath =
    args.only === null ? manifestPath : path.join(versionDir, 'snapshot.partial.json');
  console.log(`Version des données de jeu : ${version}`);

  if (!args.dryRun && !args.refresh && args.only === null) {
    try {
      const existing = JSON.parse(await readFile(manifestPath, 'utf8')) as SnapshotManifest;
      if (existing.complete && existing.gameVersion === version) {
        console.log(`Snapshot ${version} déjà complet (${manifestPath}) : rien à faire.`);
        return;
      }
    } catch {
      // no manifest yet
    }
  }
  await mkdir(versionDir, { recursive: true });
  cache.setDir(path.join(versionDir, 'cache'));

  // 2. Count pass: one $limit=0 request per phase A table. Cheap, cached, and lets us refuse to start.
  console.log('\nPhase A — tables complètes (décompte)');
  const totals = new Map<string, number>();
  let plannedA = 0;
  for (const table of PHASE_A_TABLES) {
    if (!wants(table.name)) continue;
    const body = (await getJson(buildListUrl(BASE, table.route, { limit: 0 }))) as {
      total?: unknown;
    };
    const total = typeof body.total === 'number' ? body.total : 0;
    totals.set(table.name, total);
    const pages = pageCount(total);
    plannedA += pages;
    console.log(
      `  ${table.name.padEnd(24)} ${String(total).padStart(6)} lignes → ${String(pages).padStart(3)} requêtes`,
    );
  }
  console.log(
    `  Total phase A : ${plannedA} requêtes (+ 1 pour /version, + ${totals.size} de décompte).`,
  );
  console.log(
    `  Phase B (${PHASE_B_NAMES.join(', ')}) : calculée à partir des IDs référencés par la phase A, par lots de ${PAGE_SIZE}.`,
  );

  if (plannedA + client.stats().requests > args.maxRequests) {
    throw new Halt(
      `phase A seule dépasse le budget de ${args.maxRequests} requêtes : refus de démarrer`,
    );
  }
  if (args.dryRun) {
    console.log('\n--dry-run : aucune donnée téléchargée.');
    return;
  }

  // 3. Download helpers.
  const runStart = Date.now();
  async function fetchAll(
    name: string,
    route: string,
    query: Omit<ListQuery, 'limit' | 'skip'>,
    label: string,
  ): Promise<unknown[]> {
    const report = (resources[name] ??= { rows: 0, pages: 0, files: [] });
    const rows: unknown[] = [];
    let skip = 0;
    for (;;) {
      const url = buildListUrl(BASE, route, { ...query, limit: PAGE_SIZE, skip });
      const body = (await getJson(url)) as { total?: unknown; data?: unknown };
      const data = Array.isArray(body.data) ? (body.data as unknown[]) : [];
      const total = typeof body.total === 'number' ? body.total : data.length;
      rows.push(...data);
      report.rows += data.length;
      report.pages += 1;
      report.files.push(cacheFileName(url));
      const stats = client.stats();
      const elapsed = Date.now() - runStart;
      console.log(
        `  [${name}] ${label} · ${skip + data.length}/${total} lignes · ${stats.requests} requêtes, ${stats.cacheHits} en cache · ${formatDuration(elapsed)}`,
      );
      skip += PAGE_SIZE;
      if (data.length === 0 || skip >= total) break;
    }
    return rows;
  }

  async function fetchByIds(
    name: string,
    route: string,
    inField: string,
    ids: Iterable<number>,
    select: readonly string[],
  ): Promise<unknown[]> {
    const chunks = chunkIds(ids);
    const rows: unknown[] = [];
    for (const [index, chunk] of chunks.entries()) {
      rows.push(
        ...(await fetchAll(
          name,
          route,
          { inField, inValues: chunk, select },
          `lot ${index + 1}/${chunks.length}`,
        )),
      );
    }
    if (chunks.length === 0) resources[name] ??= { rows: 0, pages: 0, files: [] };
    return rows;
  }

  // 4. Phase A.
  console.log('\nPhase A — téléchargement');
  const tables = new Map<string, unknown[]>();
  for (const table of PHASE_A_TABLES) {
    if (!wants(table.name)) continue;
    tables.set(
      table.name,
      await fetchAll(table.name, table.route, { select: table.select }, 'pages'),
    );
  }

  // 5. Phase B — referenced entities only.
  const needsPhaseB = PHASE_B_NAMES.some(wants);
  if (needsPhaseB) {
    const missing = ['quests', 'achievements', 'dungeons', 'item-types'].filter(
      (n) => !tables.has(n),
    );
    if (missing.length > 0) {
      throw new Halt(
        `phase B demandée sans ${missing.join(', ')} : ajoute ces tables à --only (elles viennent du cache si déjà téléchargées)`,
      );
    }
    console.log('\nPhase B — entités référencées');
    const refs = collectReferences({
      quests: tables.get('quests') ?? [],
      achievements: tables.get('achievements') ?? [],
      dungeons: tables.get('dungeons') ?? [],
    });

    const dofusType = (tables.get('item-types') ?? []).find((t) => {
      const name = (t as { name?: { fr?: unknown } } | null)?.name;
      return name?.fr === 'Dofus';
    }) as { id?: unknown } | undefined;
    if (typeof dofusType?.id !== 'number')
      throw new Halt("type d'objet « Dofus » introuvable dans item-types");

    let dofusItems: unknown[] = [];
    if (wants('dofus-items')) {
      dofusItems = await fetchAll(
        'dofus-items',
        '/items',
        { filters: { typeId: dofusType.id }, select: ITEM_SELECT },
        'pages',
      );
    }
    const dofusIds = new Set(
      dofusItems
        .map((i) => (i as { id?: unknown } | null)?.id)
        .filter((id): id is number => typeof id === 'number'),
    );
    const itemIds = [...refs.items].filter((id) => !dofusIds.has(id));

    const planned =
      chunkIds(itemIds).length +
      chunkIds(refs.npcs).length +
      chunkIds(refs.subareas).length +
      chunkIds(refs.missingAchievementObjectives).length;
    console.log(
      `  Référencés : ${itemIds.length} objets, ${refs.monsters.size} monstres (avant drops), ${refs.npcs.size} PNJ, ${refs.subareas.size} sous-zones, ${refs.missingAchievementObjectives.size} objectifs de succès non embarqués → au moins ${planned} requêtes.`,
    );
    if (client.stats().requests + planned > args.maxRequests) {
      throw new Halt(
        `la phase B dépasserait le budget de ${args.maxRequests} requêtes : arrêt avant de commencer`,
      );
    }

    const items = wants('items')
      ? await fetchByIds('items', '/items', 'id', itemIds, ITEM_SELECT)
      : [];
    const second = collectFromItems([...items, ...dofusItems]);

    const recipes = wants('recipes')
      ? await fetchByIds('recipes', '/recipes', 'resultId', second.itemsWithRecipe, RECIPE_SELECT)
      : [];
    if (wants('ingredient-items')) {
      const known = new Set([...itemIds, ...dofusIds]);
      const ingredients = [...collectIngredients(recipes)].filter((id) => !known.has(id));
      await fetchByIds('ingredient-items', '/items', 'id', ingredients, INGREDIENT_SELECT);
    }
    if (wants('monsters')) {
      await fetchByIds(
        'monsters',
        '/monsters',
        'id',
        new Set([...refs.monsters, ...second.monsters]),
        MONSTER_SELECT,
      );
    }
    if (wants('npcs')) await fetchByIds('npcs', '/npcs', 'id', refs.npcs, NPC_SELECT);
    if (wants('subareas'))
      await fetchByIds('subareas', '/subareas', 'id', refs.subareas, SUBAREA_SELECT);
    if (wants('achievement-objectives')) {
      await fetchByIds(
        'achievement-objectives',
        '/achievement-objectives',
        'id',
        refs.missingAchievementObjectives,
        ACHIEVEMENT_OBJECTIVE_SELECT,
      );
    }
  }

  // 6. Manifest.
  const stats = client.stats();
  const manifest: SnapshotManifest = {
    gameVersion: version,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    complete: args.only === null,
    requests: stats.requests,
    cacheHits: stats.cacheHits,
    resources,
  };
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nSnapshot ${version} écrit : ${outputPath}`);
  console.log(
    `Requêtes réseau : ${stats.requests} · réponses lues en cache : ${stats.cacheHits} · reprises : ${stats.retries}`,
  );
  for (const [name, report] of Object.entries(resources)) {
    console.log(
      `  ${name.padEnd(24)} ${String(report.rows).padStart(6)} lignes · ${report.pages} réponses`,
    );
  }
}

main().catch((error: unknown) => {
  if (error instanceof Halt) console.error(`\nARRÊT : ${error.message}`);
  else console.error(error);
  process.exitCode = 1;
});
