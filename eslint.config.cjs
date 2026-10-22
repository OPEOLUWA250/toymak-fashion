const { defineConfig, globalIgnores } = require('eslint/config');
const nextVitals = require('eslint-config-next/core-web-vitals');
const nextTs = require('eslint-config-next/typescript');
module.exports = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  globalIgnores(['.next/**', 'node_modules/**', 'artifacts/**', 'next-env.d.ts']),
]);
