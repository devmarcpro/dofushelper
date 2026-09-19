/**
 * npm run data:fixture -- --goal <item:ID | quest:ID | achievement:ID>
 *   → tests/fixtures/<slug>.json : the complete sub-graph of the goal, in the compiled dataset format.
 * npm run data:fixture -- --catalog
 *   → prints the goal catalog with the size of each plan (upper bound), as a Markdown table.
 * Reads public/data/ (run npm run data:build first). Deterministic output.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CompiledDataset, DatasetManifest } from '../../src/core/dataset';
import { stableStringify } from './stable-json';
import { catalogTable, extractSubgraph, type GoalSpec } from './subgraph';
import { validateDataset } from './validate';

const DATA_DIR = path.join('public', 'data');
const FIXTURE_DIR = path.join('tests', 'fixtures');

class FixtureError extends Error {}

async function readJson<T>(file: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), 'utf8')) as T;
  } catch {
    throw new FixtureError(
      `${path.join(DATA_DIR, file)} illisible : lance d'abord npm run data:build`,
    );
  }
}

async function loadDataset(): Promise<{ manifest: DatasetManifest; dataset: CompiledDataset }> {
  return {
    manifest: await readJson<DatasetManifest>('manifest.json'),
    dataset: {
      quests: await readJson('quests.json'),
      achievements: await readJson('achievements.json'),
      items: await readJson('items.json'),
      monsters: await readJson('monsters.json'),
      dungeons: await readJson('dungeons.json'),
      refs: await readJson('refs.json'),
      goals: await readJson('goals.json'),
    },
  };
}

function parseGoal(value: string | undefined): GoalSpec {
  const match = /^(item|quest|achievement):(\d+)$/.exec(value ?? '');
  if (!match) throw new FixtureError('--goal attend item:<id>, quest:<id> ou achievement:<id>');
  const id = Number(match[2]);
  if (match[1] === 'item') return { t: 'item', itemId: id };
  return match[1] === 'quest' ? { t: 'quest', id } : { t: 'achievement', id };
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
  const { manifest, dataset } = await loadDataset();

  if (process.argv.includes('--catalog')) {
    console.log('| Objet | Nom | Niv. | Source | Quêtes | Succès | Nœuds | Manquants |');
    console.log('|---:|---|---:|---|---:|---:|---:|---:|');
    for (const row of catalogTable(dataset)) {
      console.log(
        `| ${row.itemId} | ${row.name} | ${row.level ?? '?'} | ${row.sources} | ${row.quests} | ${row.achievements} | ${row.nodes} | ${row.missing} |`,
      );
    }
    return;
  }

  const goalIndex = process.argv.indexOf('--goal');
  const goal = parseGoal(goalIndex >= 0 ? process.argv[goalIndex + 1] : undefined);
  const { dataset: subgraph, missing } = extractSubgraph(dataset, goal);
  if (subgraph.quests.length + subgraph.achievements.length === 0) {
    throw new FixtureError(
      `objectif introuvable ou sans source dans le dataset ${manifest.gameVersion}`,
    );
  }
  const problems = validateDataset(subgraph);
  if (problems.length > 0)
    throw new FixtureError(`sous-graphe invalide :\n  - ${problems.slice(0, 10).join('\n  - ')}`);

  let label: string;
  if (goal.t === 'item') label = subgraph.items.find((i) => i.id === goal.itemId)?.name ?? '';
  else if (goal.t === 'quest') label = subgraph.quests.find((q) => q.id === goal.id)?.name ?? '';
  else label = subgraph.achievements.find((a) => a.id === goal.id)?.name ?? '';
  const goalId = goal.t === 'item' ? goal.itemId : goal.id;
  const slug = `${goal.t}-${goalId}-${slugify(label)}`.replace(/-$/, '');

  await mkdir(FIXTURE_DIR, { recursive: true });
  const out = path.join(FIXTURE_DIR, `${slug}.json`);
  const body = stableStringify({
    _source: `Extrait de public/data (DofusDB, version ${manifest.gameVersion}) par npm run data:fixture. ${manifest.attribution}`,
    gameVersion: manifest.gameVersion,
    goal,
    missing,
    dataset: subgraph,
  });
  await writeFile(out, body);
  console.log(
    `${out} : ${subgraph.quests.length} quêtes, ${subgraph.achievements.length} succès, ${subgraph.items.length} objets, ${subgraph.monsters.length} monstres, ${subgraph.dungeons.length} donjons · ${Buffer.byteLength(body)} octets · ${missing.length} nœud(s) manquant(s)`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof FixtureError) console.error(`ÉCHEC data:fixture — ${error.message}`);
  else console.error(error);
  process.exitCode = 1;
});
