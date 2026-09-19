import { defineConfig } from 'vitest/config';

/**
 * Base path of the site. GitHub Pages serves the project at https://<user>.github.io/<repo>/,
 * so the repository name is the base. Override with VITE_BASE (e.g. "/") for another host.
 */
const base = process.env.VITE_BASE ?? '/dofushelper/';

export default defineConfig({
  base,
  // JSX runtime and import source (preact) come from tsconfig.json.
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'tests/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
    environment: 'node',
    // The ESLint guard test boots ESLint in-process; give it room on slow machines.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/main.tsx'],
      reporter: ['text', 'html'],
    },
  },
});
