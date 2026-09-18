// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const coreDir = path.join(rootDir, 'src', 'core');

/**
 * Local rule: a file under src/core may only import files under src/core.
 * Bare specifiers (packages, node builtins) are refused as well.
 * @type {import('eslint').Rule.RuleModule}
 */
const coreImportsOnlyCore = {
  meta: {
    type: 'problem',
    docs: { description: 'src/core must not import anything outside src/core (golden rule 5)' },
    messages: {
      bare: "src/core cannot import package '{{source}}': the core is pure and dependency-free.",
      outside: "src/core cannot import '{{source}}': it resolves outside src/core.",
    },
    schema: [],
  },
  create(context) {
    /** @param {import('estree').Node & { source?: import('estree').Expression | null }} node */
    function check(node) {
      const source = node.source;
      if (!source || source.type !== 'Literal' || typeof source.value !== 'string') return;
      const spec = source.value;
      if (!spec.startsWith('.')) {
        context.report({ node: source, messageId: 'bare', data: { source: spec } });
        return;
      }
      const target = path.resolve(path.dirname(context.filename), spec);
      const relative = path.relative(coreDir, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        context.report({ node: source, messageId: 'outside', data: { source: spec } });
      }
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression(node) {
        check(/** @type {any} */ (node));
      },
    };
  },
};

const corePlugin = { rules: { 'imports-only-core': coreImportsOnlyCore } };

export default defineConfig([
  globalIgnores(['dist/', 'node_modules/', 'coverage/', 'data/raw/', 'public/data/']),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Browser code
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Node code: scripts, config, tests
  {
    files: ['scripts/**/*.{ts,mjs,js}', 'tests/**/*.ts', '*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Guard rails for the pure core (CLAUDE.md, golden rule 5)
  {
    files: ['src/core/**/*.{ts,tsx}'],
    plugins: { core: corePlugin },
    rules: {
      'core/imports-only-core': 'error',
      'no-restricted-globals': [
        'error',
        ...[
          'fetch',
          'XMLHttpRequest',
          'WebSocket',
          'window',
          'document',
          'navigator',
          'location',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'globalThis',
        ].map((name) => ({
          name,
          message: `'${name}' is forbidden in src/core: the core is pure (no DOM, no network, no storage).`,
        })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            'Date.now() is forbidden in src/core: no implicit clock. Pass the time as input.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() without argument is forbidden in src/core: no implicit clock.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Math.random() is forbidden in src/core: outputs must be deterministic.',
        },
      ],
    },
  },

  // Test files may use the vitest globals if needed; keep them as explicit imports for now.
  {
    files: ['src/core/**/*.test.ts'],
    rules: { 'core/imports-only-core': 'off' },
  },

  eslintConfigPrettier,
]);
