import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintTs from "typescript-eslint";

// export default eslintTs.config({
const defaultConfig = eslintTs.config({
    extends: [eslint.configs.recommended, ...eslintTs.configs.recommended, eslintPluginPrettierRecommended],
    plugins: {
        "@stylistic": stylistic,
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
                overrides: [
                    {
                        files: ["*.md", "*.yml", "*.yaml"],
                        options: {
                            tabWidth: 2,
                        },
                    },
                ],
                importOrder: ["^react", "^react-dom", "^@waldiez/react"],
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
                allowTemplateLiterals: false,
            },
        ],
        curly: ["error", "all"],
        eqeqeq: "error",
        "prefer-arrow-callback": "error",
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
