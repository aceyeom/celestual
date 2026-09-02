// eslint.config.js - the mechanical half of the build gate.
//
// docs/rebuild-spec.md section 15 makes a typecheck the first criterion for a
// finished phase. There is no TypeScript in this app and adding it is not in
// any phase, so the substitute agreed for the rebuild is the production build
// plus this file plus `npm run lint:voice`. That only means something if this
// actually runs, and until now the `lint` script had no config to run against.
//
// Deliberately narrow. It catches what a build does not: a name that is never
// defined, a hook called conditionally, a case that falls through. It does not
// carry a style opinion, because the repository already has one and a linter
// is not where it is argued.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['../dist/**', 'dist/**', 'node_modules/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The two classic rules only. This plugin's `recommended` set now also
      // carries the React Compiler's purity and ref rules, which flag long
      // standing patterns all over an app that is not compiled with it. Those
      // are a project of their own, not a gate on a design phase.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // The wall and the production app both catch and ignore on purpose in
      // places where the failure is the expected path (a blocked localStorage,
      // a canvas the browser will not give). An empty block with a comment in
      // it is that, written out.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
    },
  },
]
