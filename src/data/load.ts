/**
 * Loads the compiled dataset from public/data/ — the only network access of the site
 * (golden rule 3). The manifest comes first; each file is then requested with its content
 * hash in the URL, so the HTTP cache can keep it forever and a new build is picked up at once.
 */
import { DATASET_FORMAT, type CompiledDataset, type DatasetManifest } from '../core/dataset';
import { err, ok, type Result } from '../core/result';
import { dataUrl } from './paths';

export interface LoadedDataset {
  manifest: DatasetManifest;
  dataset: CompiledDataset;
}

export type DatasetError =
  | { t: 'network'; file: string; status: number | null }
  | { t: 'invalid'; file: string; reason: string }
  | { t: 'format'; found: unknown; expected: number };

type FetchLike = (
  url: string,
  init?: { cache?: 'no-cache' | 'default' },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const ARRAY_FILES = ['quests', 'achievements', 'items', 'monsters', 'dungeons', 'goals'] as const;

async function getJson(
  fetchFn: FetchLike,
  url: string,
  file: string,
  fresh: boolean,
): Promise<Result<unknown, DatasetError>> {
  try {
    const response = await fetchFn(url, { cache: fresh ? 'no-cache' : 'default' });
    if (!response.ok) return err({ t: 'network', file, status: response.status });
    return ok(await response.json());
  } catch {
    return err({ t: 'network', file, status: null });
  }
}

export async function loadDataset(
  fetchFn: FetchLike = (url, init) => fetch(url, init),
  base: string = import.meta.env.BASE_URL,
): Promise<Result<LoadedDataset, DatasetError>> {
  const manifestResult = await getJson(
    fetchFn,
    dataUrl('manifest.json', base),
    'manifest.json',
    true,
  );
  if (!manifestResult.ok) return manifestResult;
  const manifest = manifestResult.value as Partial<DatasetManifest> | null;
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !Array.isArray(manifest.files) ||
    typeof manifest.gameVersion !== 'string'
  ) {
    return err({ t: 'invalid', file: 'manifest.json', reason: 'structure inattendue' });
  }
  if (manifest.format !== DATASET_FORMAT)
    return err({ t: 'format', found: manifest.format, expected: DATASET_FORMAT });

  const hashes = new Map(manifest.files.map((f) => [f.file, f.sha256]));
  const names = [...ARRAY_FILES, 'refs'] as const;
  const results = await Promise.all(
    names.map(async (name) => {
      const file = `${name}.json`;
      const hash = hashes.get(file);
      if (!hash) return err<DatasetError>({ t: 'invalid', file, reason: 'absent du manifest' });
      return getJson(fetchFn, `${dataUrl(file, base)}?v=${hash.slice(0, 12)}`, file, false);
    }),
  );

  const parts: Record<string, unknown> = {};
  for (const [index, result] of results.entries()) {
    const name = names[index];
    if (name === undefined) continue;
    if (!result.ok) return result;
    const isArrayFile = (ARRAY_FILES as readonly string[]).includes(name);
    if (
      isArrayFile
        ? !Array.isArray(result.value)
        : result.value === null || typeof result.value !== 'object'
    ) {
      return err({
        t: 'invalid',
        file: `${name}.json`,
        reason: isArrayFile ? 'tableau attendu' : 'objet attendu',
      });
    }
    parts[name] = result.value;
  }
  return ok({
    manifest: manifest as DatasetManifest,
    dataset: parts as unknown as CompiledDataset,
  });
}
