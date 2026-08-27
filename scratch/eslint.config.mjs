// ESLint flat configuration for the scratch package.
//
// The only rule currently enforced is the RightPane_Lib purity lock required
// by the Platform Architecture Consolidation spec, Sprint 2, Task 4.8 /
// Requirement 2.3:
//
//   The RightPane_Lib SHALL contain zero static or dynamic imports of
//   `react`, `react-dom`, `next`, or any module path beginning with `./` or
//   `../` that resolves to a `.tsx` or `.jsx` file; and SHALL NOT call any
//   export from `axios`.
//
// The override is intentionally scoped — it only fires on files under
// `src/app/problem/[id]/RightPane/lib/**/*.ts`. Other files in the workspace
// keep their existing (unconfigured) lint behavior.
//
// Run from `scratch/` (note the bracket escaping required by the glob engine
// because `[id]` would otherwise be interpreted as a character class):
//   npx eslint "src/app/problem/[[]id[]]/RightPane/lib/**/*.ts"

import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

// The literal directory name is `[id]` (Next.js dynamic route segment).
// In glob syntax `[id]` is a character class, so we escape the brackets with
// `[[]` and `[]]` so the pattern matches the literal `[id]` directory.
const RIGHTPANE_LIB_GLOB = 'src/app/problem/[[]id[]]/RightPane/lib/**/*.ts';

const RIGHTPANE_LIB_PURITY_MESSAGE =
  'RightPane_Lib must stay pure (Requirement 2.3): no React, Next, sibling .tsx/.jsx, or network client imports.';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'server/data/**',
      'src/data/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-self-assign': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: [RIGHTPANE_LIB_GLOB],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: RIGHTPANE_LIB_PURITY_MESSAGE },
            { name: 'react-dom', message: RIGHTPANE_LIB_PURITY_MESSAGE },
            { name: 'next', message: RIGHTPANE_LIB_PURITY_MESSAGE },
            { name: 'axios', message: RIGHTPANE_LIB_PURITY_MESSAGE },
          ],
          patterns: [
            // Any next/* subpath (next/router, next/navigation, next/server, ...).
            { group: ['next/*'], message: RIGHTPANE_LIB_PURITY_MESSAGE },
            // Any react-dom/* subpath (react-dom/server, react-dom/client, ...).
            { group: ['react-dom/*'], message: RIGHTPANE_LIB_PURITY_MESSAGE },
            // Any axios/* subpath defensively.
            { group: ['axios/*'], message: RIGHTPANE_LIB_PURITY_MESSAGE },
            // Sibling / relative imports of .tsx or .jsx component files.
            { group: ['*.tsx', '*.jsx', './*.tsx', './*.jsx', '../*.tsx', '../*.jsx'], message: RIGHTPANE_LIB_PURITY_MESSAGE },
          ],
        },
      ],
    },
  },
];
