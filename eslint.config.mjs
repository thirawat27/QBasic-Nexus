import globals from "globals";
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            globals: {
                ...globals.commonjs,
                ...globals.node,
                ...globals.mocha,
                // VS Code / Environment globals
                vscode: "readonly",
                document: "readonly",
                window: "readonly",
                navigator: "readonly",
                fetch: "readonly",
                acquireVsCodeApi: "readonly",
                TextDecoder: "readonly",
                TextEncoder: "readonly"
            },
            ecmaVersion: 2022,
            sourceType: "commonjs",
        },
        rules: {
            "no-unused-vars": ["warn", { 
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            "no-undef": "warn",
            "semi": ["error", "always"],
            "quotes": ["warn", "single", { "avoidEscape": true }],
            "no-empty": "warn",
            "no-const-assign": "warn",
            "no-this-before-super": "warn",
            "no-unreachable": "warn",
            "constructor-super": "warn",
            "valid-typeof": "warn",
        },
        ignores: ["**/*.d.ts"]
    }
];