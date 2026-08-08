import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'icons/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // logger.ts is the only sanctioned console user. Everything else routes
      // through it so debug output can be switched off in users' consoles.
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Unhandled promises in a content script fail silently and are miserable to
      // debug, so they are an error rather than a warning.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['src/shared/logger.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Build scripts run in Node, outside the extension's type environment.
    files: ['scripts/**/*.ts', '*.config.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
