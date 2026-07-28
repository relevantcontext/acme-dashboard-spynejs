import js from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import mochaPlugin from 'eslint-plugin-mocha';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'dist/', 'src/tests/', 'repo-scripts'],
  },
  {
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // typical browser + Node + Mocha globals
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
      },
    },

    // Register both Prettier & Mocha plugins
    plugins: {
      prettier: prettierPlugin,
      mocha: mochaPlugin,
    },

    // Merge ESLint’s recommended rules, Prettier’s recommended rules,
    // and Mocha’s recommended rules
    rules: {
      ...js.configs.recommended.rules,
      ...prettierPlugin.configs.recommended.rules,
      ...mochaPlugin.configs.recommended.rules,
    },
  },
];
