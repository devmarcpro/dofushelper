/**
 * Proves that the ESLint guard rails for src/core actually bite (CLAUDE.md, golden rule 5).
 * The snippets are linted in memory under a fake src/core path: no file is written.
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function ruleIdsFor(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? 'unknown');
}

const CORE_FILE = 'src/core/_guard-probe.ts';

describe('src/core guard rails', () => {
  it('forbids importing packages', async () => {
    const ids = await ruleIdsFor(
      "import { signal } from '@preact/signals';\nexport const s = signal(1);\n",
      CORE_FILE,
    );
    expect(ids).toContain('core/imports-only-core');
  });

  it('forbids importing files outside src/core', async () => {
    const ids = await ruleIdsFor(
      "import { fr } from '../ui/strings.fr';\nexport const name = fr.app.name;\n",
      CORE_FILE,
    );
    expect(ids).toContain('core/imports-only-core');
  });

  it('allows importing files inside src/core, even from a nested folder', async () => {
    const ids = await ruleIdsFor(
      "import { CORE_VERSION } from '../version';\nexport const v = CORE_VERSION;\n",
      'src/core/criteria/_probe.ts',
    );
    expect(ids).not.toContain('core/imports-only-core');
  });

  it.each(['fetch', 'window', 'document', 'localStorage', 'sessionStorage', 'indexedDB'])(
    'forbids the global %s',
    async (name) => {
      const ids = await ruleIdsFor(`export const x = typeof ${name};\n`, CORE_FILE);
      expect(ids).toContain('no-restricted-globals');
    },
  );

  it('forbids Date.now() and new Date() without argument', async () => {
    expect(await ruleIdsFor('export const t = Date.now();\n', CORE_FILE)).toContain(
      'no-restricted-syntax',
    );
    expect(await ruleIdsFor('export const d = new Date();\n', CORE_FILE)).toContain(
      'no-restricted-syntax',
    );
  });

  it('allows new Date(value) since the time is passed as input', async () => {
    const ids = await ruleIdsFor('export const d = (ms: number) => new Date(ms);\n', CORE_FILE);
    expect(ids).not.toContain('no-restricted-syntax');
  });

  it('does not apply the core rules outside src/core', async () => {
    const ids = await ruleIdsFor(
      "import { render } from 'preact';\nexport const t = Date.now();\nexport const w = window;\nexport { render };\n",
      'src/ui/_probe.ts',
    );
    expect(ids).not.toContain('core/imports-only-core');
    expect(ids).not.toContain('no-restricted-syntax');
    expect(ids).not.toContain('no-restricted-globals');
  });
});
