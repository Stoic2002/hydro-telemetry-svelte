import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			/**
			 * `resolve()` melindungi tautan ketika aplikasi dipasang di bawah sub-path
			 * (`paths.base`). Dashboard ini disajikan nginx pada root domain dan
			 * `paths.base` dibiarkan kosong — lihat `deploy/nginx.conf`. Mewajibkan
			 * `resolve()` di sini hanya akan memaksa `features/plta/routing.ts`, yang
			 * disalin utuh dari versi React, ditulis ulang tanpa manfaat nyata.
			 *
			 * Kalau suatu saat aplikasi dipindah ke sub-path, aturan ini harus
			 * dinyalakan lagi lebih dulu.
			 */
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
