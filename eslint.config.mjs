/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import headers from "eslint-plugin-headers";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintTs from "typescript-eslint";

// export default eslintTs.config({
const defaultConfig = eslintTs.config({
    extends: [eslint.configs.recommended, ...eslintTs.configs.recommended, eslintPluginPrettierRecommended],
    plugins: {
        "@stylistic": stylistic,
        "react-hooks": reactHooks,
        "react-refresh": eslintPluginReactRefresh,
        headers,
    },
    rules: {
        "prettier/prettier": [
            "error",
            {
                plugins: ["@trivago/prettier-plugin-sort-imports"],
                tabWidth: 4,
                printWidth: 110,
                arrowParens: "avoid",
                bracketSpacing: true,
                singleQuote: false,
                trailingComma: "all",
                endOfLine: "lf",
                importOrder: [
                    "^@fortawesome/",
                    "^@xyflow/",
                    "^react",
                    "^react-dom",
                    "^react-select",
                    "^zustand",
                    "^nanoid",
                    "^rc-slider",
                    "^@monaco-editor/react",
                    "^@waldiez/",
                    "^[./]",
                ],
                importOrderSeparation: true,
                importOrderSortSpecifiers: true,
                overrides: [
                    {
                        files: ["*.md", "*.yml", "*.yaml", "*.css"],
                        options: {
                            tabWidth: 2,
                        },
                    },
                ],
            },
        ],
        "@typescript-eslint/naming-convention": [
            "error",
            {
                selector: "interface",
                format: ["PascalCase"],
                custom: {
                    regex: "^I[A-Z]",
                    match: true,
                },
            },
        ],
        "react-hooks/exhaustive-deps": "warn",
        "react-hooks/rules-of-hooks": "error",
        "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                args: "all",
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@stylistic/no-explicit-any": "off",
        "@stylistic/no-trailing-spaces": "off",
        "@stylistic/padded-blocks": "off",
        "@stylistic/function-paren-newline": "off",
        "@stylistic/no-use-before-define": "off",
        "@stylistic/quotes": [
            "error",
            "double",
            {
                avoidEscape: true,
                allowTemplateLiterals: "never",
            },
        ],
        "headers/header-format": [
            "error",
            {
                source: "string",
                content:
                    "SPDX-License-Identifier: {spdxIdentifier}\nCopyright {startYear} - {currentYear} {owner}",
                variables: {
                    spdxIdentifier: "Apache-2.0",
                    startYear: "2024",
                    currentYear: `${new Date().getFullYear()}`,
                    owner: "Waldiez & contributors",
                },
            },
        ],
        curly: ["error", "all"],
        eqeqeq: "error",
        "prefer-arrow-callback": "error",
        complexity: ["error", 20],
        "max-depth": ["error", 4],
        "max-nested-callbacks": ["error", 4],
        "max-statements": ["error", 20, { ignoreTopLevelFunctions: true }],
        "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
        "max-lines-per-function": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
});

export default [
    {
        ignores: [
            "node_modules",
            "coverage",
            "dist",
            "public",
            ".local",
            ".yarn",
            ".venv",
            "**/assets/**",
            ".git",
            ".github",
            ".husky",
            ".vscode",
            ".vscode-test",
            "examples",
        ],
    },
    ...defaultConfig.map(config => ({
        ...config,
        files: ["**/*.{ts,tsx,cjs,mjs}"],
    })),
    // overrides
    ...defaultConfig.map(config => ({
        ...config,
        files: ["*spec.ts", "*spec.tsx"],
        plugins: ["jest"],
        extends: ["plugin:jest/recommended"],
        rules: {
            ...config.rules,
            "jest/expect-expect": "off",
        },
    })),
];
