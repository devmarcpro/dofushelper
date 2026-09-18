import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The base path for GitHub Pages is configured in M0-2.
  // JSX runtime and import source (preact) come from tsconfig.json.
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    environment: 'node',
    // The ESLint guard test boots ESLint in-process; give it room on slow machines.
    testTimeout: 20_000,
  },
});
