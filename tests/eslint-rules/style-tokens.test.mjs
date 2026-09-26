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
				{ filename: 'a.vue', code: sfc('.a { letter-spacing: 0.12em; height: 60vh; }') },
				{ filename: 'a.vue', code: sfc('.a { letter-spacing: -0.025em; }') },
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
				{
					filename: 'a.vue',
					code: sfc('@media (width >= 64em) { .a { top: 0; } }'),
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply tracking-[0.12em]; }'),
				},
				{
					filename: 'a.vue',
					code: sfc('@keyframes drift-2em { from { opacity: 0; } }'),
				},
				{
					filename: 'a.vue',
					code: sfc('.a { animation-name: drift-2em; max-width: var(--panel-2em); }'),
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
					code: sfc('.a { letter-spacing: 0.08em; }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (min-width: 900px) { .a { width: 1rem; } }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (width >= 56.25em) { .a { top: 0; } }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply tracking-[0.08em]; }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { width: 64em; }'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { max-width: var(--fallback, 17px); }'),
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

describe('no-motion-important', () => {
	it('モーションに重ねた !important だけを落とす', () => {
		tester.run('no-motion-important', styleTokens.rules['no-motion-important'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { transition: color 0.15s; }') },
				{
					filename: 'a.vue',
					code: sfc('.a { @apply transition-color md:transition-move; }'),
				},
				{ filename: 'a.vue', code: sfc('.a { margin: 0 !important; }') },
				{ filename: 'a.vue', code: sfc('.a { @apply !mt-0; }') },
				{ filename: 'a.vue', code: sfc('.a { transition: none !important; }') },
				{ filename: 'a.vue', code: sfc('.a { animation-duration: 0s !important; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { transition: transform 0.2s !important; }'),
					errors: [{ messageId: 'important' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { animation-duration: var(--panel) !important; }'),
					errors: [{ messageId: 'important' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply md:!transition-move; }'),
					errors: [{ messageId: 'important' }],
				},
				// 末尾の !important は並べたクラス全部に掛かる
				{
					filename: 'a.vue',
					code: sfc('.a { @apply transition-color !important; }'),
					errors: [{ messageId: 'important' }],
				},
			],
		})
	})
})

describe('no-off-purpose-motion', () => {
	it('用途に決めた長さだけを通す', () => {
		tester.run('no-off-purpose-motion', styleTokens.rules['no-off-purpose-motion'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { transition: color 0.15s ease; }') },
				// 同じ長さの別の綴り
				{ filename: 'a.vue', code: sfc('.a { transition: background-color 150ms; }') },
				{ filename: 'a.vue', code: sfc('.a { transition: border-top-color 0.15s; }') },
				{
					filename: 'a.vue',
					code: sfc('.a { transition: color 0.15s, transform 0.2s; }'),
				},
				// 動かさない 0 は、どの用途でも通す
				{
					filename: 'a.vue',
					code: sfc(
						'.a { transition: opacity 0.2s ease-out, visibility 0s linear 0.2s; }',
					),
				},
				// 緩急の関数が持つカンマと数は、区切りでも長さでもない
				{
					filename: 'a.vue',
					code: sfc('.a { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }'),
				},
				{ filename: 'a.vue', code: sfc('.a { transition: none; }') },
				// 関数の中の語は対象の名前ではない
				{
					filename: 'a.vue',
					code: sfc('.a { transition: transform 0.2s steps(4, end); }'),
				},
				{
					filename: 'a.vue',
					code: sfc('.a { --panel: 0.2s; transition: opacity var(--panel); }'),
				},
				{ filename: 'a.vue', code: sfc('.a { animation: spin 0.2s linear; }') },
				{
					filename: 'a.vue',
					code: sfc('.a { transition-property: opacity; transition-duration: 0.2s; }'),
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply transition-color md:transition-move; }'),
				},
				{ filename: 'a.vue', code: sfc('.a { border-radius: 0.2s; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { transition: color 0.2s; }'),
					errors: [{ messageId: 'offPurpose' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { transition: opacity 0.16s ease-out; }'),
					errors: [{ messageId: 'offPurpose' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { transition: border-top-color 0.2s; }'),
					errors: [{ messageId: 'offPurpose' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { transition: grid-template-rows 0.25s ease-in-out; }'),
					errors: [{ messageId: 'offPurpose' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { transition: all 0.3s ease-in-out; }'),
					errors: [{ messageId: 'mixed' }],
				},
				// 対象を書かない短縮形は all と同じ
				{
					filename: 'a.vue',
					code: sfc('.a { transition: 0.2s ease; }'),
					errors: [{ messageId: 'mixed' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { transition: 0.2s steps(4, end); }'),
					errors: [{ messageId: 'mixed' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { animation: spin 0.42s; }'),
					errors: [{ messageId: 'anyPurpose' }],
				},
				// var() で長さを渡す経路も塞ぐ
				{
					filename: 'a.vue',
					code: sfc('.a { --panel: 0.42s; transition: opacity var(--panel); }'),
					errors: [{ messageId: 'anyPurpose' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { transition-duration: 0.42s; }'),
					errors: [{ messageId: 'anyPurpose' }],
				},
				// 任意値は theme を通らずに出るので、@apply の綴りで見る
				{
					filename: 'a.vue',
					code: sfc('.a { @apply duration-[200ms]; }'),
					errors: [{ messageId: 'motionClass' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply transition-[color]; }'),
					errors: [{ messageId: 'motionClass' }],
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
				{ filename: 'a.vue', code: sfc('.a { @apply bg-surface-subtle; }') },
				{ filename: 'a.vue', code: sfc('@media (min-width: 768px) { .a { top: 0; } }') },
				// @apply 以外の at-rule は prelude に色の名前を持たない
				{
					filename: 'a.vue',
					code: sfc('@keyframes tomato-pop { to { opacity: 1; } }'),
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
				// 任意値はトークンの名前に無いので、テーマの分岐の検査には当たらない
				{
					filename: 'a.vue',
					code: sfc('.a { @apply dark:bg-[#0b0b0b]; }'),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})
})

describe('no-font-literal', () => {
	it('トークン由来の書体だけを通す', () => {
		tester.run('no-font-literal', styleTokens.rules['no-font-literal'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { font-family: var(--font-mono); }') },
				{ filename: 'a.vue', code: sfc('.a { font-family: inherit; }') },
				{
					filename: 'a.vue',
					code: sfc('.a { font: italic bold 1rem/1.5 var(--font-sans); }'),
				},
				{ filename: 'a.vue', code: sfc('.a { font-weight: 600; font-size: 1rem; }') },
				{ filename: 'a.vue', code: sfc('.a { @apply font-mono md:font-sans; }') },
				{ filename: 'a.vue', code: sfc(".a { font-feature-settings: 'tnum'; }") },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc(".a { font-family: 'Comic Sans MS'; }"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { font-family: Georgia, serif; }'),
					errors: [{ messageId: 'literal' }, { messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { font-family: var(--font-mono), monospace; }'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { FONT: bold 1rem Georgia; }'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply font-serif; }'),
					errors: [{ messageId: 'fontClass' }],
				},
			],
		})
	})
})

describe('no-px-font-size', () => {
	it('文字サイズの px を落とす', () => {
		tester.run('no-px-font-size', styleTokens.rules['no-px-font-size'], {
			valid: [
				{
					filename: 'a.vue',
					code: sfc('.a { font: 0.875rem/20px var(--font-sans); width: 24px; }'),
				},
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { font-size: 14px; }'),
					errors: [{ messageId: 'px' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply md:text-[26px]; }'),
					errors: [{ messageId: 'px' }],
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

describe('no-theme-branch', () => {
	it('テーマのクラス配下はカスタムプロパティの再定義だけを通す', () => {
		tester.run('no-theme-branch', styleTokens.rules['no-theme-branch'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.dark .a { --callout-rgb: var(--x-dark); }') },
				{ filename: 'a.vue', code: sfc('.light .a { --callout-rgb: var(--x-light); }') },
				{ filename: 'a.vue', code: sfc('.a { color: var(--color-main); }') },
				// テーマの綴りを含むだけのクラス名
				{ filename: 'a.vue', code: sfc('.darkroom { color: var(--color-main); }') },
				{ filename: 'a.vue', code: sfc('.highlight { color: var(--color-main); }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.dark .a { color: var(--color-sub); }'),
					errors: [{ messageId: 'themeBranch' }],
				},
				{
					filename: 'a.vue',
					code: sfc('html.dark .a { background-color: var(--color-surface); }'),
					errors: [{ messageId: 'themeBranch' }],
				},
				{
					filename: 'a.vue',
					code: sfc(':is(.dark) .a { border-color: var(--color-border); }'),
					errors: [{ messageId: 'themeBranch' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.dark .a { --x: 0; color: var(--color-sub); opacity: 1; }'),
					errors: [{ messageId: 'themeBranch' }, { messageId: 'themeBranch' }],
				},
				// colorMode の classSuffix が空なので、ライトも html のクラスで表れる
				{
					filename: 'a.vue',
					code: sfc('.light .a { color: var(--color-sub); }'),
					errors: [{ messageId: 'themeBranch' }],
				},
				{
					filename: 'a.vue',
					code: sfc('html.light .a { background-color: var(--color-surface); }'),
					errors: [{ messageId: 'themeBranch' }],
				},
				// @apply は宣言ではないので、walkDecls には出てこない
				{
					filename: 'a.vue',
					code: sfc('.dark .a { @apply text-main; }'),
					errors: [{ messageId: 'themeBranch' }],
				},
			],
		})
	})

	it('色を分岐する @apply を落とす', () => {
		tester.run('no-theme-branch', styleTokens.rules['no-theme-branch'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { @apply text-main; }') },
				{ filename: 'a.vue', code: sfc('.a { @apply md:px-4; }') },
				// DOM の出し分けは template 側と同じく通す
				{ filename: 'a.vue', code: sfc('.a { @apply dark:hidden; }') },
				{ filename: 'a.vue', code: sfc('.a { @apply dark:box-border; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { @apply dark:text-main; }'),
					errors: [{ messageId: 'themeClass' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply md:dark:bg-surface-subtle; }'),
					errors: [{ messageId: 'themeClass' }],
				},
			],
		})
	})

	it('prefers-color-scheme で分岐する @media を落とす', () => {
		tester.run('no-theme-branch', styleTokens.rules['no-theme-branch'], {
			valid: [
				{ filename: 'a.vue', code: sfc('@media (min-width: 1024px) { .a { top: 0; } }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc(
						'@media (prefers-color-scheme: dark) { .a { color: var(--color-sub); } }',
					),
					errors: [{ messageId: 'colorScheme' }],
				},
			],
		})
	})
})

describe('no-outline-removal', () => {
	it('フォーカスの輪郭を消す宣言とクラスを落とす', () => {
		tester.run('no-outline-removal', styleTokens.rules['no-outline-removal'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { outline: 2px solid var(--color-accent); }') },
				{ filename: 'a.vue', code: sfc('.a { outline: 0.5rem solid currentColor; }') },
				{ filename: 'a.vue', code: sfc('.a { outline: 2px solid rgb(0 0 0); }') },
				{ filename: 'a.vue', code: sfc('.a { outline-offset: 2px; }') },
				{ filename: 'a.vue', code: sfc('.a { outline-color: initial; }') },
				{ filename: 'a.vue', code: sfc('.a { outline: 2px solid #0ff; }') },
				{ filename: 'a.vue', code: sfc('.a { outline-width: initial; }') },
				{ filename: 'a.vue', code: sfc('.a { @apply outline-offset-0; }') },
				{ filename: 'a.vue', code: sfc('.a { border: none; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { outline: none; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a:focus-visible { OUTLINE: 0; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline-style: none; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline-width: 0px; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline: 2px solid transparent; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline: unset; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline: initial; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline-style: initial; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { all: unset; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline: 0 solid currentColor; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { outline-color: transparent; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply outline-none; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply focus-visible:outline-0; }'),
					errors: [{ messageId: 'outlineRemoval' }],
				},
			],
		})
	})
})

describe('no-scroll-behavior', () => {
	it('scroll-behavior の宣言を落とす', () => {
		tester.run('no-scroll-behavior', styleTokens.rules['no-scroll-behavior'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { overscroll-behavior: contain; }') },
				{
					filename: 'a.vue',
					code: sfc('.a { scroll-margin-top: var(--landing-offset); }'),
				},
				{ filename: 'a.vue', code: sfc('.a { @apply overscroll-contain; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('html { scroll-behavior: smooth; }'),
					errors: [{ messageId: 'scrollBehavior' }],
				},
				{
					filename: 'a.vue',
					code: sfc('html { SCROLL-BEHAVIOR: auto; }'),
					errors: [{ messageId: 'scrollBehavior' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply scroll-smooth; }'),
					errors: [{ messageId: 'scrollBehavior' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply md:scroll-auto; }'),
					errors: [{ messageId: 'scrollBehavior' }],
				},
			],
		})
	})
})

describe('no-display-none', () => {
	it('display で消す宣言とクラスを落とし、並べ方の display は通す', () => {
		tester.run('no-display-none', styleTokens.rules['no-display-none'], {
			valid: [
				{ filename: 'a.vue', code: sfc('.a { display: flex; }') },
				{ filename: 'a.vue', code: sfc('.a { display: inline-block; }') },
				{ filename: 'a.vue', code: sfc('.a { display: -webkit-box; }') },
				{ filename: 'a.vue', code: sfc('.a { border: none; outline: none; }') },
				{ filename: 'a.vue', code: sfc('.a { --display: none; }') },
				{ filename: 'a.vue', code: sfc('.a { @apply md:block; }') },
				// 綴りの重なる overflow-hidden / truncate は display を持たない
				{ filename: 'a.vue', code: sfc('.a { @apply md:overflow-hidden truncate; }') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: sfc('.a { display: none; }'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { DISPLAY: NONE; }'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { display: none; } .a.is-open { display: block; }'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: sfc('@media (min-width: 768px) { .a { display: none; } }'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a::-webkit-search-cancel-button { display: none; }'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply hidden; }'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: sfc('.a { @apply md:hidden; }'),
					errors: [{ messageId: 'displayNone' }],
				},
			],
		})
	})
})
