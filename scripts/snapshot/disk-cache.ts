/** Disk cache: one response per file under data/raw/<gameVersion>/cache/ (DATA_SOURCES.md §3.4). */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CacheStore } from './polite-client';

interface CacheFile {
  url: string;
  fetchedAt: string;
  body: unknown;
}

export function cacheFileName(url: string): string {
  return `${createHash('sha1').update(url).digest('hex')}.json`;
}

export class DiskCache implements CacheStore {
  private dir: string | null = null;

  /** The directory depends on the game version, known only after the first request. */
  setDir(dir: string): void {
    this.dir = dir;
  }

  async read(url: string): Promise<string | undefined> {
    if (this.dir === null) return undefined;
    try {
      const file = JSON.parse(
        await readFile(path.join(this.dir, cacheFileName(url)), 'utf8'),
      ) as CacheFile;
      return file.url === url ? JSON.stringify(file.body) : undefined;
    } catch {
      return undefined;
    }
  }

  async write(url: string, body: string): Promise<void> {
    if (this.dir === null) return;
    await mkdir(this.dir, { recursive: true });
    const file: CacheFile = {
      url,
      fetchedAt: new Date().toISOString(),
      body: JSON.parse(body) as unknown,
    };
    await writeFile(path.join(this.dir, cacheFileName(url)), JSON.stringify(file));
  }
}
