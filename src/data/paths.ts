/**
 * URL helpers for the compiled dataset served from public/data/.
 * Every path to public/data/ goes through here: never hard-code an absolute path
 * (the site is served under a base such as /dofushelper/ on GitHub Pages).
 */

/** Joins a base path and a relative path with exactly one slash between them. */
export function joinBase(base: string, relativePath: string): string {
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relativePath.replace(/^\/+/, '');
  return `${cleanBase}${cleanPath}`;
}

/** URL of a file of the compiled dataset, e.g. dataUrl('manifest.json') → '/dofushelper/data/manifest.json'. */
export function dataUrl(file: string, base: string = import.meta.env.BASE_URL): string {
  return joinBase(base, `data/${file.replace(/^\/+/, '')}`);
}
