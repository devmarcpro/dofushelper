/** File-system side of the build: locate a complete snapshot, load its tables and the overrides. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NodeOverride } from '../../src/core/dataset';
import { EMPTY_OVERRIDES, type Overrides, type RawSnapshot } from './compile';

const RAW_DIR = path.join('data', 'raw');
const OVERRIDES_DIR = path.join('data', 'overrides');

interface Manifest {
  gameVersion: string;
  finishedAt: string;
  complete: boolean;
  resources: Record<string, { rows: number; files: string[] }>;
}

export class BuildError extends Error {}

/** Picks the requested version, or the most recently finished complete snapshot. */
export async function findSnapshot(
  requested: string | null,
): Promise<{ dir: string; manifest: Manifest }> {
  let entries: string[];
  try {
    entries = await readdir(RAW_DIR);
  } catch {
    throw new BuildError(`${RAW_DIR} est introuvable : lance d'abord npm run data:snapshot`);
  }
  const found: { dir: string; manifest: Manifest }[] = [];
  for (const entry of entries) {
    if (requested !== null && entry !== requested) continue;
    try {
      const dir = path.join(RAW_DIR, entry);
      const manifest = JSON.parse(
        await readFile(path.join(dir, 'snapshot.json'), 'utf8'),
      ) as Manifest;
      if (manifest.complete) found.push({ dir, manifest });
    } catch {
      // not a snapshot directory
    }
  }
  found.sort((a, b) => a.manifest.finishedAt.localeCompare(b.manifest.finishedAt));
  const latest = found[found.length - 1];
  if (!latest) {
    throw new BuildError(
      requested === null
        ? `aucun snapshot complet dans ${RAW_DIR} : lance npm run data:snapshot`
        : `pas de snapshot complet pour la version ${requested}`,
    );
  }
  return latest;
}

export async function loadSnapshot(dir: string, manifest: Manifest): Promise<RawSnapshot> {
  const tables: Record<string, unknown[]> = {};
  for (const [name, resource] of Object.entries(manifest.resources)) {
    const rows: unknown[] = [];
    for (const file of resource.files) {
      const cached = JSON.parse(await readFile(path.join(dir, 'cache', file), 'utf8')) as {
        body?: { data?: unknown };
      };
      if (Array.isArray(cached.body?.data)) rows.push(...(cached.body.data as unknown[]));
    }
    tables[name] = rows;
  }
  return { gameVersion: manifest.gameVersion, tables };
}

async function readJsonObject(file: string): Promise<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new BuildError(`${file} doit contenir un objet JSON`);
  } catch (error) {
    if (error instanceof BuildError) throw error;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new BuildError(`${file} illisible : ${(error as Error).message}`);
  }
}

export async function loadOverrides(): Promise<Overrides> {
  return {
    ...EMPTY_OVERRIDES,
    quests: (await readJsonObject(path.join(OVERRIDES_DIR, 'quests.json'))) as Record<
      string,
      NodeOverride
    >,
    achievements: (await readJsonObject(path.join(OVERRIDES_DIR, 'achievements.json'))) as Record<
      string,
      NodeOverride
    >,
    items: (await readJsonObject(path.join(OVERRIDES_DIR, 'items.json'))) as Overrides['items'],
  };
}
