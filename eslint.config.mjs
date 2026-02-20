// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: [
			"eslint.config.mjs",
			"dist/**/*",
			"**/*.interface.ts",
			"**/interface/**/*",
			"**/interfaces/**/*",
			"/packages/db/clickhouse/repositories/interfaces/*.ts",
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	eslintPluginPrettierRecommended,

	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
				Bun: "readonly",
			},
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},

		plugins: {
			import: importPlugin,
			"simple-import-sort": simpleImportSort,
		},
	},
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",

			// indent: ["error", "tab", { SwitchCase: 1 }],
			"linebreak-style": ["error", "unix"],
			quotes: [
				"error",
				"double",
				{ avoidEscape: true, allowTemplateLiterals: true },
			],
			semi: ["error", "always"],

			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",
			"import/first": "error",
			"import/no-duplicates": "error",

			"no-unused-expressions": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"no-console": "warn",
			"no-undef": "off",
			"no-redeclare": "warn",
			"no-shadow": "warn",
		},
	},
);
