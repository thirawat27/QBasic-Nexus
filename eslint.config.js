const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                // Node.js globals
                'module': 'readonly',
                'require': 'readonly',
                'process': 'readonly',
                '__dirname': 'readonly',
                '__filename': 'readonly',
                'exports': 'writable',
                'console': 'readonly',
                'setTimeout': 'readonly',
                'clearTimeout': 'readonly',
                'setInterval': 'readonly',
                'clearInterval': 'readonly',
                'Buffer': 'readonly',
                
                // VS Code / Environment globals
                'vscode': 'readonly',
                'document': 'readonly',
                'window': 'readonly',
                'navigator': 'readonly',
                'fetch': 'readonly',
                'acquireVsCodeApi': 'readonly',
                'TextDecoder': 'readonly',
                'TextEncoder': 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { 
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_'
            }],
            'no-undef': 'warn',
            'semi': ['error', 'always'],
            'quotes': ['warn', 'single', { 'avoidEscape': true }],
            'no-empty': 'warn'
        },
        ignores: ['**/*.d.ts']
    }
];
