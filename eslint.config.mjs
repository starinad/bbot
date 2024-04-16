import globals from 'globals';
import pluginJs from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: { sourceType: 'module' },
    },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    prettier,
    {
        rules: {
            'prettier/prettier': ['error', { singleQuote: true, tabWidth: 4 }],
            'linebreak-style': ['error', 'unix'],
            semi: ['error', 'always'],
        },
    },
];
