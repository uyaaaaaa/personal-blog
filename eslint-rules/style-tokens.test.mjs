import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { describe, it } from 'vitest'
import styleTokens from './style-tokens.mjs'

const tester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
})

const sfc = (css) => `<template><div class="a" /></template>\n<style scoped>${css}</style>`

describe('no-untokenized-size', () => {
	it('語彙にある長さだけを通す', () => {
		tester.run('no-untokenized-size', styleTokens.rules['no-untokenized-size'], {
			valid: [
				{
					filename: 'a.vue',
					code: sfc('.a { padding: 0.75rem 1.5rem; border: 1px solid; }'),
				},
				// theme/tokens.ts の sizes に名前がある値
				{ filename: 'a.vue', code: sfc('.a { width: 960px; max-width: 1200px; }') },
				// 負の値は絶対値で見る
				{ filename: 'a.vue', code: sfc('.a { transform: translateY(-4px); }') },
				// 相対単位は語彙を持たないので見ない
				{ filename: 'a.vue', code: sfc('.a { letter-spacing: 0.08em; height: 60vh; }') },
				{
					filename: 'a.vue',
					code: sfc('@media (min-width: 1024px) { .a { width: 1rem; } }'),
				},
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { width: 17px; }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { font-size: 0.95rem; }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (min-width: 900px) { .a { width: 1rem; } }'),
					errors: [{ messageId: 'untokenized' }],
				},
			],
		})
	})
})

describe('no-color-literal', () => {
	it('トークン由来の色だけを通す', () => {
		tester.run('no-color-literal', styleTokens.rules['no-color-literal'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { color: var(--color-main); outline: none; }') },
				{
					filename: 'a.vue',
					code: sfc('.a { background-color: rgba(var(--callout-rgb), 0.1); }'),
				},
				// ガイドラインが例外に挙げる白・黒とその透過
				{
					filename: 'a.vue',
					code: sfc('.a { color: #fff; background: rgba(0, 0, 0, 0.5); }'),
				},
				// 色の名前と綴りが重なるだけの値
				{
					filename: 'a.vue',
					code: sfc(".a { transition: color 0.2s ease; content: 'red'; }"),
				},
				{
					filename: 'a.vue',
					code: sfc('.a { scrollbar-color: var(--color-scrollbar) transparent; }'),
				},
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { color: #ff0000; }'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { border: 1px solid red; }'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc(
						'.a { background-image: linear-gradient(to right, tomato, transparent); }',
					),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})
})
