import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { describe, it } from 'vitest'
import styleTokens from '~~/eslint-rules/style-tokens.mjs'

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
				{ filename: 'a.vue', code: sfc('.a { width: 960px; max-width: 1200px; }') },
				{ filename: 'a.vue', code: sfc('.a { transform: translateY(-4px); }') },
				{ filename: 'a.vue', code: sfc('.a { letter-spacing: 0.08em; height: 60vh; }') },
				{ filename: 'a.vue', code: sfc(".a { content: '17px'; }") },
				{
					filename: 'a.vue',
					code: sfc(
						'.a { background: url("data:image/svg+xml,%3Csvg width=\'17px\'%3E"); }',
					),
				},
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
				{
					filename: 'a.vue',
					code: sfc('.a { max-width: var(--fallback, 13px); }'),
					errors: [{ messageId: 'untokenized' }],
				},
			],
		})
	})
})

describe('no-important', () => {
	it('!important だけを落とす', () => {
		tester.run('no-important', styleTokens.rules['no-important'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { color: var(--color-main); }') },
				{ filename: 'a.vue', code: sfc(".a { content: '!important'; }") },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { color: var(--color-main) !important; }'),
					errors: [{ messageId: 'important' }],
				},
			],
		})
	})
})

describe('no-reduced-motion', () => {
	it('prefers-reduced-motion を参照する @media を落とす', () => {
		tester.run('no-reduced-motion', styleTokens.rules['no-reduced-motion'], {
			valid: [
				{ filename: 'a.vue', code: sfc('@media (min-width: 1024px) { .a { top: 0; } }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc(
						'@media (prefers-reduced-motion: reduce) { .a { transition: none; } }',
					),
					errors: [{ messageId: 'reducedMotion' }],
				},
			],
		})
	})
})

describe('no-custom-breakpoint', () => {
	it('md と lg の境界だけを通す', () => {
		tester.run('no-custom-breakpoint', styleTokens.rules['no-custom-breakpoint'], {
			valid: [
				{ filename: 'a.vue', code: sfc('@media (min-width: 768px) { .a { top: 0; } }') },
				{ filename: 'a.vue', code: sfc('@media (min-width: 1024px) { .a { top: 0; } }') },
				{ filename: 'a.vue', code: sfc('@media (max-width: 48rem) { .a { top: 0; } }') },
				{ filename: 'a.vue', code: sfc('@media (width >= 64em) { .a { top: 0; } }') },
				{
					filename: 'a.vue',
					code: sfc('@media screen and (min-width: 768px) { .a { top: 0; } }'),
				},
				{ filename: 'a.vue', code: sfc('@media print { .a { top: 0; } }') },
				{
					filename: 'a.vue',
					code: sfc('@media (min-resolution: 2dppx) { .a { top: 0; } }'),
				},
				{ filename: 'a.vue', code: sfc('.a { min-width: 0; max-width: 36rem; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('@media (min-width: 640px) { .a { top: 0; } }'),
					errors: [{ messageId: 'breakpoint' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (max-width: 1023px) { .a { top: 0; } }'),
					errors: [{ messageId: 'breakpoint' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (width < 40rem) { .a { top: 0; } }'),
					errors: [{ messageId: 'breakpoint' }],
				},
				{
					filename: 'a.vue',
					code: sfc(
						'@media (min-width: 640px) and (max-width: 1280px) { .a { top: 0; } }',
					),
					errors: [{ messageId: 'breakpoint' }, { messageId: 'breakpoint' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (min-width: 50vw) { .a { top: 0; } }'),
					errors: [{ messageId: 'breakpoint' }],
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
				{
					filename: 'a.vue',
					code: sfc('.a { color: #fff; background: rgba(0, 0, 0, 0.5); }'),
				},
				{ filename: 'a.vue', code: sfc('.a { color: var(--color-teal); }') },
				{ filename: 'a.vue', code: sfc('.a { background: url(/img/orange.png); }') },
				{
					filename: 'a.vue',
					code: sfc(
						'.a { border-color: rgb(255 255 255 / 50%); color: rgba(255, 255, 255, 50%); }',
					),
				},
				{
					filename: 'a.vue',
					code: sfc(
						'.a { color: rgb(255, 255, 255); background-color: rgb(255 255 255); }',
					),
				},
				{
					filename: 'a.vue',
					code: sfc('.a { color: rgb(0, 0, 0); background-color: rgb(100% 100% 100%); }'),
				},
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
				{
					filename: 'a.vue',
					code: sfc('.a { outline-color: rgb(255 0 0 / 50%); }'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { fill: var(--fallback-color, #123456); }'),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})
})

describe('no-web-font', () => {
	it('@font-face と @import を落とす', () => {
		tester.run('no-web-font', styleTokens.rules['no-web-font'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { font-family: var(--font-mono); }') },
				{ filename: 'a.vue', code: sfc('@media (min-width: 1024px) { .a { top: 0; } }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc("@font-face { font-family: 'X'; src: url('/x.woff2'); }"),
					errors: [{ messageId: 'webFont' }],
				},
				{
					filename: 'a.vue',
					code: sfc("@import url('https://fonts.googleapis.com/css2?family=X');"),
					errors: [{ messageId: 'import' }],
				},
				// 引く先がリポジトリ内でも、その CSS は lint が読まない
				{
					filename: 'a.vue',
					code: sfc("@import './local.css';"),
					errors: [{ messageId: 'import' }],
				},
				// CSS の at-rule 名は大文字小文字を区別しない
				{
					filename: 'a.vue',
					code: sfc("@FONT-FACE { src: url('/x.woff2'); }"),
					errors: [{ messageId: 'webFont' }],
				},
				{
					filename: 'a.vue',
					code: sfc("@Import './local.css';"),
					errors: [{ messageId: 'import' }],
				},
			],
		})
	})
})
