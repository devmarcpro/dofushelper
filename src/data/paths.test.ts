import { describe, expect, it } from 'vitest';
import { dataUrl, joinBase } from './paths';

describe('data/paths', () => {
  it('joins a base ending with a slash', () => {
    expect(joinBase('/dofushelper/', 'data/manifest.json')).toBe('/dofushelper/data/manifest.json');
  });

  it('joins a base without a trailing slash', () => {
    expect(joinBase('/dofushelper', 'data/manifest.json')).toBe('/dofushelper/data/manifest.json');
  });

  it('never doubles the slash', () => {
    expect(joinBase('/dofushelper/', '/data/manifest.json')).toBe(
      '/dofushelper/data/manifest.json',
    );
    expect(joinBase('/', '/data/manifest.json')).toBe('/data/manifest.json');
  });

  it('builds dataset URLs under the given base', () => {
    expect(dataUrl('manifest.json', '/dofushelper/')).toBe('/dofushelper/data/manifest.json');
    expect(dataUrl('/quests.json', '/')).toBe('/data/quests.json');
  });

  it('defaults to the Vite base URL', () => {
    expect(dataUrl('manifest.json')).toBe(joinBase(import.meta.env.BASE_URL, 'data/manifest.json'));
  });
});
