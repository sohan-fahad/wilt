import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
	{
		ignores: ["**/dist/", "**/node_modules/", "**/.wrangler/"],
	},
	js.configs.recommended,
	{
		files: ["packages/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: "module",
			},
			globals: {
				console: "readonly",
				process: "readonly",
				Response: "readonly",
				Request: "readonly",
				Headers: "readonly",
				URL: "readonly",
				fetch: "readonly",
				FormData: "readonly",
				CloudflareBindings: "readonly",
				D1Database: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"no-empty": ["error", { allowEmptyCatch: true }],
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-non-null-assertion": "warn",
			"@typescript-eslint/no-unsafe-function-type": "off",
			"prefer-const": "warn",
			"no-var": "warn",
			"no-console": "off",
		},
	},
];
