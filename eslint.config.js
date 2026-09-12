import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'backend/dist', 'legacy'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'unused-imports': unusedImports,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'off',
                { allowConstantExport: true },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
            ],
            'prefer-const': 'warn',
            'no-empty': 'warn',
            // These React Compiler diagnostics are not applicable until this
            // project opts into the compiler. Standard async loading effects
            // otherwise produce false positives throughout the current app.
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
        },
    },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['backend/src/**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
        },
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-namespace': 'off',
            'prefer-const': 'warn',
            'no-empty': 'warn',
        },
    }
);
