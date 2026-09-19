/**
 * npm run data:build — data/raw/<version> + data/overrides → public/data/ (DATA_SOURCES.md §6).
 * Options: --version <gameVersion> (default: latest complete snapshot) · --lang <code> (default fr)
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DATASET_FORMAT, type DatasetManifest } from '../../src/core/dataset';
import { compileDataset } from './compile';
import { BuildError, findSnapshot, loadOverrides, loadSnapshot } from './raw';
import { stableStringify } from './stable-json';
import { validateDataset } from './validate';

const OUT_DIR = path.join('public', 'data');
const ATTRIBUTION = 'Données issues de DofusDB. Utilisation soumise à la LPNC-IA 1.0.';

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

async function main(): Promise<void> {
  const lang = option('--lang') ?? 'fr';
  const { dir, manifest } = await findSnapshot(option('--version'));
  console.log(`Snapshot : ${dir} (version ${manifest.gameVersion})`);

  const raw = await loadSnapshot(dir, manifest);
  const overrides = await loadOverrides();
  const { dataset, errors, warnings } = compileDataset(raw, overrides, lang);
  if (errors.length > 0)
    throw new BuildError(`overrides invalides :\n  - ${errors.join('\n  - ')}`);

  const problems = validateDataset(dataset);
  if (problems.length > 0) {
    throw new BuildError(
      `validation de schéma : ${problems.length} problème(s)\n  - ${problems.slice(0, 20).join('\n  - ')}`,
    );
  }

  const files: Record<string, unknown> = {
    'quests.json': dataset.quests,
    'achievements.json': dataset.achievements,
    'items.json': dataset.items,
    'monsters.json': dataset.monsters,
    'dungeons.json': dataset.dungeons,
    'refs.json': dataset.refs,
    'goals.json': dataset.goals,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const entries: DatasetManifest['files'] = [];
  for (const [file, content] of Object.entries(files)) {
    const body = stableStringify(content);
    await writeFile(path.join(OUT_DIR, file), body);
    entries.push({
      file,
      bytes: Buffer.byteLength(body),
      sha256: createHash('sha256').update(body).digest('hex'),
    });
  }
  // The manifest is the only file allowed to carry a timestamp.
  const datasetManifest: DatasetManifest = {
    format: DATASET_FORMAT,
    gameVersion: raw.gameVersion,
    lang,
    builtAt: new Date().toISOString(),
    attribution: ATTRIBUTION,
    files: entries,
  };
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify(datasetManifest, null, 2)}\n`,
  );

  console.log(
    `Compilé : ${dataset.quests.length} quêtes, ${dataset.achievements.length} succès, ${dataset.items.length} objets, ${dataset.monsters.length} monstres, ${dataset.dungeons.length} donjons, ${dataset.goals.length} objectifs au catalogue.`,
  );
  for (const entry of entries)
    console.log(`  ${entry.file.padEnd(20)} ${String(entry.bytes).padStart(9)} octets`);
  console.log(`${warnings.length} avertissement(s) (détail dans npm run data:report).`);
}

main().catch((error: unknown) => {
  if (error instanceof BuildError) console.error(`ÉCHEC data:build — ${error.message}`);
  else console.error(error);
  process.exitCode = 1;
});
