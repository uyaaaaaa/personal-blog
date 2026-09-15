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

const attribute = (spelling) => `<template><div ${spelling} /></template>`

const script = (body) => `<template><div /></template>\n<script setup>${body}</script>`

const handler = (body) => `<template><div @click="${body}" /></template>`

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
					code: sfc('.a { max-width: var(--fallback, 17px); }'),
					errors: [{ messageId: 'untokenized' }],
				},
			],
		})
	})

	it('script が要素のスタイルに書く長さも宣言と同じ判定で落とす', () => {
		tester.run('no-untokenized-size', styleTokens.rules['no-untokenized-size'], {
			valid: [{ filename: 'a.vue', code: script("el.style.width = '1rem'") }],
			invalid: [
				{
					filename: 'a.vue',
					code: script("el.style.width = '17px'"),
					errors: [{ messageId: 'untokenized' }],
				},
			],
		})
	})

	it('style 属性の長さも宣言と同じ判定で落とす', () => {
		tester.run('no-untokenized-size', styleTokens.rules['no-untokenized-size'], {
			valid: [
				{ filename: 'a.vue', code: attribute('style="padding: 0.75rem"') },
				{ filename: 'a.vue', code: attribute(':style="{ maxWidth: \'1200px\' }"') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: attribute('style="padding: 137px"'),
					errors: [{ messageId: 'untokenized' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="{ maxWidth: \'137px\' }"'),
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

	// <style> しか読まない判定も、script が組み立てたスタイルシートには当たる
	it('script が組み立てたスタイルシートも同じ判定で落とす', () => {
		tester.run('no-important', styleTokens.rules['no-important'], {
			valid: [{ filename: 'a.vue', code: script("sheet.insertRule('.a { top: 0; }')") }],
			invalid: [
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('.a { top: 0 !important; }')"),
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

	it('script が要素のスタイルに書く色も宣言と同じ判定で落とす', () => {
		tester.run('no-color-literal', styleTokens.rules['no-color-literal'], {
			valid: [
				{ filename: 'a.vue', code: script("el.style.color = 'var(--color-main)'") },
				{ filename: 'a.vue', code: script("el.style.overflow = 'hidden'") },
				{ filename: 'a.vue', code: script("el.style.setProperty('overflow', 'hidden')") },
				{ filename: 'a.vue', code: script('const kind = el.style.color') },
				{ filename: 'a.vue', code: script("el.setAttribute('title', 'tomato')") },
				{
					filename: 'a.vue',
					code: script("Object.assign(el.dataset, { tone: 'tomato' })"),
				},
				{ filename: 'a.vue', code: script("el.dataset.style = 'color: tomato'") },
				{ filename: 'a.vue', code: script("el.dataset['style'] = 'color: tomato'") },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: script("el.style.color = '#ff0000'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style['background-color'] = 'tomato'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style[name] = '#ff0000'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.setProperty('color', 'tomato')"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.cssText = 'color: #ff0000'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.setAttribute('style', 'color: tomato')"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("Object.assign(el.style, { color: 'tomato' })"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.color = open ? '#ff0000' : '#00ff00'"),
					errors: [{ messageId: 'literal' }, { messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el['style'].color = '#ff0000'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style['setProperty']('color', 'tomato')"),
					errors: [{ messageId: 'literal' }],
				},
				// 行内ハンドラは <script> の外なので、template 側の visitor が要る
				{
					filename: 'a.vue',
					code: handler("el.style.color = '#ff0000'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: handler("el.style.setProperty('color', 'tomato')"),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})

	it('script が組み立てたスタイルシートの色も宣言と同じ判定で落とす', () => {
		tester.run('no-color-literal', styleTokens.rules['no-color-literal'], {
			valid: [
				{ filename: 'a.vue', code: script("sheet.insertRule('.a { display: flex; }')") },
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('.a { color: var(--color-main); }')"),
				},
				// 規則を持たない綴りはスタイルシートではない
				{ filename: 'a.vue', code: script("el.setAttribute('title', 'tomato')") },
				{ filename: 'a.vue', code: script("const url = 'https://example.com/?q=tomato'") },
				{ filename: 'a.vue', code: script('const json = \'{ "color": "tomato" }\'') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('.a { color: tomato; }')"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("tag.textContent = '.a { color: #ff0000; }'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("tag.innerHTML = '.a { color: tomato; }'"),
					errors: [{ messageId: 'literal' }],
				},
				// 書き込み先を数えないので、束縛越しに組み立てても当たる
				{
					filename: 'a.vue',
					code: script("const css = '.a { color: tomato; }'\ntag.textContent = css"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script('sheet.replaceSync(`.a { color: tomato; }`)'),
					errors: [{ messageId: 'literal' }],
				},
				// HTML ごと書く経路では <style> の中身だけが CSS
				{
					filename: 'a.vue',
					code: script("tag.innerHTML = '<style>.a { color: tomato; }</style>'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: handler("sheet.insertRule('.a { color: tomato; }')"),
					errors: [{ messageId: 'literal' }],
				},
				// 宣言の並びとして読んだ値は、スタイルシートとして読み直さない
				{
					filename: 'a.vue',
					code: script("el.style.cssText = '.a { color: tomato; }'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.setAttribute('style', '.a { color: tomato; }')"),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})

	it('style 属性の色も宣言と同じ判定で落とす', () => {
		tester.run('no-color-literal', styleTokens.rules['no-color-literal'], {
			valid: [
				{ filename: 'a.vue', code: attribute('style="color: var(--color-main)"') },
				{ filename: 'a.vue', code: attribute(':style="{ color: \'var(--color-main)\' }"') },
				{ filename: 'a.vue', code: attribute(':style="{ opacity }"') },
				{
					filename: 'a.vue',
					code: attribute(':style="{ \'--callout-rgb-light\': config.rgb }"'),
				},
				{ filename: 'a.vue', code: attribute('style="color: rgba(0, 0, 0, 0.5)"') },
				{
					filename: 'a.vue',
					code: attribute(':style="{ backgroundImage: asset(\'red-panda.png\') }"'),
				},
				{ filename: 'a.vue', code: attribute(':style="{ color: palette[\'tomato\'] }"') },
				{
					filename: 'a.vue',
					code: attribute(':style="{ color: kind === \'red\' ? main : sub }"'),
				},
			],
			invalid: [
				{
					filename: 'a.vue',
					code: attribute('style="color: #ff0000"'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="{ backgroundColor: \'tomato\' }"'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(":style=\"{ color: open ? '#ff0000' : '#00ff00' }\""),
					errors: [{ messageId: 'literal' }, { messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="{ color: open && \'red\' }"'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="{ ...{ color: \'#ff0000\' } }"'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="{ [name]: \'#ff0000\' }"'),
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

	it('script が要素のスタイルに書く書体も宣言と同じ判定で落とす', () => {
		tester.run('no-font-literal', styleTokens.rules['no-font-literal'], {
			valid: [
				{ filename: 'a.vue', code: script("el.style.fontFamily = 'var(--font-mono)'") },
				{ filename: 'a.vue', code: script("el.style.fontWeight = '600'") },
				{ filename: 'a.vue', code: script("el.style.overflow = 'hidden'") },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: script("el.style.fontFamily = 'Comic Sans MS'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.font = 'bold 1rem Georgia'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.setProperty('font-family', 'Georgia')"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.cssText = 'font-family: Verdana'"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("Object.assign(el.style, { fontFamily: 'Georgia' })"),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})

	it('script が組み立てたスタイルシートの書体も宣言と同じ判定で落とす', () => {
		tester.run('no-font-literal', styleTokens.rules['no-font-literal'], {
			valid: [
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('.a { font-family: var(--font-mono); }')"),
				},
				{ filename: 'a.vue', code: script("sheet.insertRule('.a { font-weight: 600; }')") },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('.a { font-family: Georgia; }')"),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: script("tag.textContent = '.a { font: bold 1rem Verdana; }'"),
					errors: [{ messageId: 'literal' }],
				},
				// 規則でなくとも、本体を持つ at-rule は同じ並びとして読む
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('@font-face { font-family: Georgia; }')"),
					errors: [{ messageId: 'literal' }],
				},
			],
		})
	})

	it('style 属性の書体も宣言と同じ判定で落とす', () => {
		tester.run('no-font-literal', styleTokens.rules['no-font-literal'], {
			valid: [
				{ filename: 'a.vue', code: attribute('style="font-family: var(--font-mono)"') },
				{
					filename: 'a.vue',
					code: attribute(':style="{ fontFamily: \'var(--font-mono)\' }"'),
				},
				{ filename: 'a.vue', code: attribute(':style="{ opacity }"') },
				{ filename: 'a.vue', code: attribute('style="font-weight: 600"') },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: attribute('style="font-family: \'Comic Sans MS\'"'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="{ fontFamily: \'Comic Sans MS\' }"'),
					errors: [{ messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(":style=\"{ 'font-family': open ? 'Georgia' : 'Verdana' }\""),
					errors: [{ messageId: 'literal' }, { messageId: 'literal' }],
				},
				{
					filename: 'a.vue',
					code: attribute(':style="`font-family: ${name}; font-family: Georgia`"'),
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

	// 本体を持たない at-rule も規則の並びとして読む。フォントの資源の綴りは
	// no-restricted-syntax に寄せたので、ここに残るのは @import と @font-face
	it('script が組み立てた @import と @font-face を落とす', () => {
		tester.run('no-web-font', styleTokens.rules['no-web-font'], {
			valid: [
				{
					filename: 'a.vue',
					code: script('sheet.insertRule(\'@font-face { src: url("/x.woff2"); }\')'),
				},
				{ filename: 'a.vue', code: script("sheet.insertRule('.a { top: 0; }')") },
			],
			invalid: [
				{
					filename: 'a.vue',
					code: script('sheet.insertRule(\'@import url("/theme.css")\')'),
					errors: [{ messageId: 'import' }],
				},
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('@font-face { font-family: Georgia; }')"),
					errors: [{ messageId: 'webFont' }],
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

	// 同じ綴りを no-restricted-syntax が Literal から読むので、ここからは読まない
	it('script が組み立てたスタイルシートは読まない', () => {
		tester.run('no-scroll-behavior', styleTokens.rules['no-scroll-behavior'], {
			valid: [
				{
					filename: 'a.vue',
					code: script("sheet.insertRule('html { scroll-behavior: smooth; }')"),
				},
			],
			invalid: [],
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
				// 出し分けを持つのは template のクラス
				{ filename: 'a.vue', code: attribute('class="hidden md:block"') },
				{ filename: 'a.vue', code: attribute('style="display: flex"') },
				{ filename: 'a.vue', code: script("el.style.overflow = 'hidden'") },
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
				{
					filename: 'a.vue',
					code: attribute('style="display: none"'),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: attribute(`:style="{ display: open ? 'block' : 'none' }"`),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.display = 'none'"),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.setProperty('display', 'none')"),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: script("el.style.cssText = 'display: none'"),
					errors: [{ messageId: 'displayNone' }],
				},
				{
					filename: 'a.vue',
					code: handler("el.style.display = 'none'"),
					errors: [{ messageId: 'displayNone' }],
				},
			],
		})
	})
})
