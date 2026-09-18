import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const eslint = new ESLint({ cwd: ROOT })

const WEB_FONT = /Web フォントを読み込まない/
const THEME_BRANCH = /dark: で色を分岐しない|prefers-color-scheme で分岐しない/
const LANDING = /着地位置は CSS が持つ|scroll-behavior は宣言しない/
const OUTLINE = /フォーカスの輪郭を消さない/
const IMPORTANT = /!important は書かない/
const INLINE_STYLE = /style 属性と el\.style に書かない/
const STYLESHEET = /スタイルシートを組み立てない/
const SINGLE_SOURCE = /色の直値|書体の名前|fontFamily が持つ名前のクラス/
const RENDER_ONLY = /ルートファイルは実体コンポーネント/
const STDIN = /標準入力は scripts\/stdin\.mjs だけが読む/
const PUBLISHED = /記事のクエリには公開制御/
const DOM_ASSEMBLY = /DOM を組み立てない/
const DISPLAY = /display: none を宣言に書かない/
const MOTION = /決めた長さではない|モーションのクラスは用途の名前|transition の対象に all/

// 落ちる理由が他のルールに移っても気づけるよう、Web フォントの指摘だけを数える
const webFontsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => WEB_FONT.test(message.message)).length
}

const themeBranchesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => THEME_BRANCH.test(message.message)).length
}

const landingsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => LANDING.test(message.message)).length
}

const outlinesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => OUTLINE.test(message.message)).length
}

const importantsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => IMPORTANT.test(message.message)).length
}

const inlineStylesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => INLINE_STYLE.test(message.message)).length
}

const stylesheetsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => STYLESHEET.test(message.message)).length
}

const singleSourcesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => SINGLE_SOURCE.test(message.message)).length
}

const motionsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => MOTION.test(message.message)).length
}

const displaysIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => DISPLAY.test(message.message)).length
}

const renderOnlyIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => RENDER_ONLY.test(message.message)).length
}

const stdinReadsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => STDIN.test(message.message)).length
}

const publishedIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => PUBLISHED.test(message.message)).length
}

const assembliesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => DOM_ASSEMBLY.test(message.message)).length
}

// 並びの指摘は綴りが eslint-plugin-vue のものなので、ルール名で数える
const blockOrdersIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => message.ruleId === 'vue/block-order').length
}

const config = (body) => `export default defineNuxtConfig({\n${body}\n})`

const sfc = (template, script = '') =>
	`<template>${template}</template>\n<script setup lang="ts">${script}</script>`

describe('Web フォントの読み込み', () => {
	it('設定ファイルの modules と head.link を落とす', async () => {
		expect(
			await webFontsIn('nuxt.config.ts', config("\tmodules: ['@nuxtjs/google-fonts'],")),
		).toBeGreaterThan(0)
		expect(
			await webFontsIn(
				'nuxt.config.ts',
				config(
					"\tapp: { head: { link: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=X' }] } },",
				),
			),
		).toBeGreaterThan(0)
		expect(
			await webFontsIn(
				'nuxt.config.ts',
				config(
					"\tapp: { head: { link: [{ rel: 'preload', as: 'font', href: '/x.woff2' }] } },",
				),
			),
		).toBeGreaterThan(0)
	})

	it('パッケージから配られるフォントを落とす', async () => {
		expect(
			await webFontsIn(
				'nuxt.config.ts',
				config(
					"\tapp: { head: { link: [{ rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/@fontsource/inter/index.css' }] } },",
				),
			),
		).toBeGreaterThan(0)
		expect(
			await webFontsIn('nuxt.config.ts', config("\tcss: ['@fontsource/inter/index.css'],")),
		).toBeGreaterThan(0)
		expect(
			await webFontsIn('nuxt.config.ts', config("\tmodules: ['@nuxtjs/fontaine'],")),
		).toBeGreaterThan(0)
	})

	it('typography の css は通す', async () => {
		expect(
			await webFontsIn(
				'tailwind.config.ts',
				"export default { theme: { extend: { typography: { DEFAULT: { css: { code: { fontWeight: '400' } } } } } } }",
			),
		).toBe(0)
	})

	it('設定ファイルの既存の読み込みは通す', async () => {
		expect(
			await webFontsIn(
				'nuxt.config.ts',
				config(
					"\tmodules: ['@nuxt/content'],\n\tapp: { head: { link: [{ rel: 'icon', href: '/favicon.svg' }] } },",
				),
			),
		).toBe(0)
	})

	it('テンプレートと script の読み込みを落とす', async () => {
		expect(
			await webFontsIn(
				'app/pages/a.vue',
				sfc('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X" />'),
			),
		).toBeGreaterThan(0)
		expect(
			await webFontsIn(
				'app/pages/a.vue',
				sfc('<div />', "new FontFace('X', 'url(/x.woff2)')"),
			),
		).toBeGreaterThan(0)
		expect(await webFontsIn('app/utils/a.ts', "import '@fontsource/inter'")).toBeGreaterThan(0)
	})

	it('フォントを指すクラス名は通す', async () => {
		expect(await webFontsIn('app/pages/a.vue', sfc('<div class="font-mono text-sm" />'))).toBe(
			0,
		)
	})
})

describe('テーマごとの分岐', () => {
	it('色を分岐する dark: のクラスを落とす', async () => {
		expect(
			await themeBranchesIn('app/components/ui/a.vue', sfc('<p class="dark:text-sub" />')),
		).toBeGreaterThan(0)
		expect(
			await themeBranchesIn(
				'app/pages/a.vue',
				sfc('<p class="md:dark:bg-surface-subtle" />'),
			),
		).toBeGreaterThan(0)
		expect(
			await themeBranchesIn('app/pages/a.vue', sfc('<p class="dark:bg-accent/10" />')),
		).toBeGreaterThan(0)
		expect(
			await themeBranchesIn('app/pages/a.vue', sfc('<p class="dark:border-border" />')),
		).toBeGreaterThan(0)
		expect(
			await themeBranchesIn(
				'app/pages/a.vue',
				sfc('<p :class="{ \'dark:text-main\': on }" />', 'const on = true'),
			),
		).toBeGreaterThan(0)
	})

	it('Tailwind 既定の色も落とす', async () => {
		expect(
			await themeBranchesIn('app/pages/a.vue', sfc('<p class="dark:bg-white" />')),
		).toBeGreaterThan(0)
	})

	it('DOM を出し分ける dark: は通す', async () => {
		expect(await themeBranchesIn('app/pages/a.vue', sfc('<svg class="dark:hidden" />'))).toBe(0)
		expect(
			await themeBranchesIn('app/pages/a.vue', sfc('<svg class="hidden dark:block" />')),
		).toBe(0)
		expect(
			await themeBranchesIn(
				'app/pages/a.vue',
				sfc('<div class="prose prose-slate dark:prose-invert" />'),
			),
		).toBe(0)
	})

	it('テーマを持たないクラスは通す', async () => {
		expect(
			await themeBranchesIn('app/pages/a.vue', sfc('<p class="bg-surface-subtle" />')),
		).toBe(0)
	})

	it('色を取らない接頭辞のクラスは通す', async () => {
		expect(await themeBranchesIn('app/pages/a.vue', sfc('<p class="dark:box-border" />'))).toBe(
			0,
		)
		expect(await themeBranchesIn('app/pages/a.vue', sfc('<p class="dark:align-sub" />'))).toBe(
			0,
		)
	})

	it('辺を指す色のクラスは落とす', async () => {
		expect(
			await themeBranchesIn('app/pages/a.vue', sfc('<p class="dark:border-t-border" />')),
		).toBeGreaterThan(0)
	})

	it('script の prefers-color-scheme を落とす', async () => {
		expect(
			await themeBranchesIn(
				'app/composables/useA.ts',
				"export const useA = () => window.matchMedia('(prefers-color-scheme: dark)')",
			),
		).toBeGreaterThan(0)
		expect(
			await themeBranchesIn(
				'app/pages/a.vue',
				sfc('<p />', "window.matchMedia('(prefers-color-scheme: dark)')"),
			),
		).toBeGreaterThan(0)
	})
})

describe('ページ内ジャンプの着地位置', () => {
	it('ページ全体を動かす呼び出しを落とす', async () => {
		expect(
			await landingsIn(
				'app/components/ui/a.vue',
				sfc('<div />', 'window.scrollTo({ top: 0 })'),
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				'export const useA = () => window.scroll(0, 0)',
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				'export const useA = () => document.documentElement.scrollTo({ top: 0 })',
			),
		).toBeGreaterThan(0)
	})

	it('スクロール位置への代入を落とす', async () => {
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				'export const useA = (n: number) => (document.documentElement.scrollTop -= n)',
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				'export const useA = () => (document.body.scrollTop = 0)',
			),
		).toBeGreaterThan(0)
	})

	it('集約先の外の scrollIntoView を落とす', async () => {
		expect(
			await landingsIn(
				'app/components/layout/a.vue',
				sfc(
					'<div />',
					"document.querySelector('.a')?.scrollIntoView({ block: 'nearest' })",
				),
			),
		).toBeGreaterThan(0)
	})

	it('CSS の宣言を JS から書く経路を落とす', async () => {
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				"export const useA = (el: HTMLElement) => (el.style.scrollBehavior = 'smooth')",
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				"export const useA = (el: HTMLElement) => el.style.setProperty('scroll-behavior', 'smooth')",
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/router.options.ts',
				'export default { scrollBehavior: () => ({ top: 0 }) }',
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/router.options.ts',
				"export default { scrollBehaviorType: 'smooth' }",
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'nuxt.config.ts',
				config("\trouter: { options: { scrollBehaviorType: 'smooth' } },"),
			),
		).toBeGreaterThan(0)
	})

	it('テンプレートのクラスと式を落とす', async () => {
		expect(
			await landingsIn('app/pages/a.vue', sfc('<div class="scroll-smooth" />')),
		).toBeGreaterThan(0)
		expect(
			await landingsIn('app/pages/a.vue', sfc('<div class="md:scroll-auto" />')),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'app/pages/a.vue',
				sfc('<button @click="window.scrollTo({ top: 0 })" />'),
			),
		).toBeGreaterThan(0)
	})

	it('設定ファイルが html に配る指定を落とす', async () => {
		expect(
			await landingsIn(
				'nuxt.config.ts',
				config("\tapp: { head: { htmlAttrs: { class: 'scroll-smooth' } } },"),
			),
		).toBeGreaterThan(0)
		expect(
			await landingsIn(
				'nuxt.config.ts',
				config("\tapp: { head: { htmlAttrs: { style: 'scroll-behavior: smooth' } } },"),
			),
		).toBeGreaterThan(0)
	})

	it('集約先は通す', async () => {
		expect(
			await landingsIn(
				'app/composables/useScrollTo.ts',
				"export const useScrollTo = () => {\n\tdocument.getElementById('a')?.scrollIntoView({ behavior: 'smooth' })\n\twindow.scrollTo({ top: 0, behavior: 'smooth' })\n}",
			),
		).toBe(0)
	})

	it('器の中の項目送りとスクロール位置の読み取りは通す', async () => {
		expect(
			await landingsIn(
				'app/components/layout/a.vue',
				sfc(
					'<div />',
					'const container = ref<HTMLElement | null>(null)\nif (container.value) container.value.scrollTop += 8',
				),
			),
		).toBe(0)
		expect(
			await landingsIn('app/components/ui/a.vue', sfc('<div />', 'const y = window.scrollY')),
		).toBe(0)
	})

	it('綴りの重なる overscroll は通す', async () => {
		expect(await landingsIn('app/pages/a.vue', sfc('<div class="overscroll-contain" />'))).toBe(
			0,
		)
		expect(
			await landingsIn(
				'app/pages/a.vue',
				sfc('<div style="overscroll-behavior: contain" />'),
			),
		).toBe(0)
		expect(
			await landingsIn(
				'app/composables/useA.ts',
				"export const useA = (el: HTMLElement) => el.style.setProperty('overscroll-behavior', 'contain')",
			),
		).toBe(0)
	})
})

describe('フォーカスの輪郭', () => {
	it('テンプレートのクラスを落とす', async () => {
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input class="outline-none" />')),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input class="focus-visible:outline-0" />')),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input :class="[\'outline-none\']" />')),
		).toBeGreaterThan(0)
	})

	it('綴りの重なるクラスは通す', async () => {
		expect(await outlinesIn('app/pages/a.vue', sfc('<input class="outline-offset-0" />'))).toBe(
			0,
		)
	})
})

describe('スタイルの置き場', () => {
	it('style 属性と、カスタムプロパティでない :style を落とす', async () => {
		expect(await inlineStylesIn('app/pages/a.vue', sfc('<p style="color: red" />'))).toBe(1)
		expect(await inlineStylesIn('app/pages/a.vue', sfc('<p :style="{ opacity: 1 }" />'))).toBe(
			1,
		)
		expect(
			await inlineStylesIn('app/pages/a.vue', sfc('<p :style="s" />', `const s = ''`)),
		).toBe(1)
		expect(
			await inlineStylesIn('app/pages/a.vue', sfc('<p :style="[s]" />', 'const s = {}')),
		).toBe(1)
		expect(
			await inlineStylesIn('app/pages/a.vue', sfc('<p :style="{ ...s }" />', 'const s = {}')),
		).toBe(1)
	})

	it('カスタムプロパティを渡す :style は通す', async () => {
		expect(
			await inlineStylesIn(
				'app/pages/a.vue',
				sfc(`<p :style="{ '--callout-rgb': rgb }" />`, `const rgb = '124, 58, 237'`),
			),
		).toBe(0)
	})

	it('script から要素のスタイルへ書く経路を落とす', async () => {
		expect(await inlineStylesIn('app/utils/a.ts', "el.style.overflow = 'hidden'")).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', "el['style'].overflow = 'hidden'")).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', "el.style['overflow'] = 'hidden'")).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', "el.style.cssText = 'color: red'")).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', 'Object.assign(el.style, s)')).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', "el.setAttribute('style', s)")).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', "el.style.setProperty('opacity', v)")).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', 'el.style.setProperty(name, v)')).toBe(1)
		expect(await inlineStylesIn('app/utils/a.ts', "el.style.removeProperty('color')")).toBe(1)
		expect(
			await inlineStylesIn(
				'app/components/ui/A.vue',
				sfc(`<p @click="el.style.top = '0'" />`, 'const el = document.body'),
			),
		).toBe(1)
	})

	it('読み取りとカスタムプロパティの出し入れは通す', async () => {
		expect(await inlineStylesIn('app/utils/a.ts', 'const v = el.style.display')).toBe(0)
		expect(
			await inlineStylesIn('app/utils/a.ts', "const v = el.style.getPropertyValue('--a')"),
		).toBe(0)
		expect(await inlineStylesIn('app/utils/a.ts', "el.style.setProperty('--a', v)")).toBe(0)
		expect(await inlineStylesIn('app/utils/a.ts', "el.style.removeProperty('--a')")).toBe(0)
		expect(await inlineStylesIn('app/utils/a.ts', "el.setAttribute('aria-label', s)")).toBe(0)
	})

	it('script がスタイルシートを組み立てる経路を落とす', async () => {
		expect(await stylesheetsIn('app/utils/a.ts', 'new CSSStyleSheet()')).toBe(1)
		expect(await stylesheetsIn('app/utils/a.ts', 'document.adoptedStyleSheets = []')).toBe(1)
		expect(await stylesheetsIn('app/utils/a.ts', 'document.styleSheets[0]')).toBe(1)
		expect(
			await stylesheetsIn('app/components/ui/A.vue', sfc('<p />', `const t = '<style>'`)),
		).toBe(1)
	})

	it('規則になっている文字列を、流し込む先に依らず落とす', async () => {
		expect(await stylesheetsIn('app/utils/a.ts', "const t = '.a { top: 0; }'")).toBe(1)
		expect(
			await stylesheetsIn(
				'app/utils/a.ts',
				"document.querySelector('style').textContent = 'body{transition:all 3s}'",
			),
		).toBe(1)
		expect(await stylesheetsIn('app/utils/a.ts', "sheet.insertRule('.a { top: 0; }')")).toBe(1)
		expect(await stylesheetsIn('app/utils/a.ts', 'sheet.insertRule(css)')).toBe(1)
		expect(await stylesheetsIn('app/utils/a.ts', "const t = '@font-face { src: x }'")).toBe(1)
		expect(await stylesheetsIn('app/utils/a.ts', 'const t = `.a { top: 0; }`')).toBe(1)
	})

	it('規則の形をしていない文字列は通す', async () => {
		expect(await stylesheetsIn('app/utils/a.ts', `const t = '{"top": "0"}'`)).toBe(0)
		expect(await stylesheetsIn('app/utils/a.ts', `const t = 'a[href="#x"]'`)).toBe(0)
		expect(await stylesheetsIn('app/utils/a.ts', "document.querySelector('style')")).toBe(0)
	})
})

describe('色と書体の単一情報源', () => {
	it('トークンに無い family のクラスを落とす', async () => {
		expect(
			await singleSourcesIn('app/pages/a.vue', sfc('<p class="font-serif" />')),
		).toBeGreaterThan(0)
		expect(
			await singleSourcesIn('app/pages/a.vue', sfc(`<p :class="['md:font-serif']" />`)),
		).toBeGreaterThan(0)
		expect(await singleSourcesIn('app/pages/a.vue', sfc('<p class="font-mono" />'))).toBe(0)
		expect(await singleSourcesIn('app/pages/a.vue', sfc('<p class="font-medium" />'))).toBe(0)
	})

	it('<style> と .css と同じ判定で見る', async () => {
		const style = `<style scoped>.a { font-family: 'Comic Sans MS'; }</style>`
		expect(
			await singleSourcesIn('app/pages/a.vue', `${sfc('<p class="a" />')}\n${style}`),
		).toBeGreaterThan(0)
	})
})

describe('表示・非表示の出し分け', () => {
	it('出し分けを持つ template のクラスは通す', async () => {
		expect(await displaysIn('app/pages/a.vue', sfc('<p class="hidden md:block" />'))).toBe(0)
	})

	it('<style> の宣言と @apply を落とす', async () => {
		const style = (css) => `${sfc('<p class="a" />')}\n<style scoped>${css}</style>`
		expect(await displaysIn('app/pages/a.vue', style('.a { display: none; }'))).toBe(1)
		expect(await displaysIn('app/pages/a.vue', style('.a { @apply md:hidden; }'))).toBe(1)
		expect(await displaysIn('app/pages/a.vue', style('.a { display: grid; }'))).toBe(0)
	})
})

describe('モーションの長さ', () => {
	it('用途の名前でないモーションのクラスを落とす', async () => {
		expect(await motionsIn('app/pages/a.vue', sfc('<p class="duration-200" />'))).toBe(1)
		expect(await motionsIn('app/pages/a.vue', sfc('<p class="transition-colors" />'))).toBe(1)
		expect(await motionsIn('app/pages/a.vue', sfc('<p class="md:animate-spin" />'))).toBe(1)
		expect(
			await motionsIn('app/pages/a.vue', sfc(`<p :class="['transition-transform']" />`)),
		).toBe(1)
	})

	it('用途の名前のクラスは通す', async () => {
		expect(
			await motionsIn(
				'app/pages/a.vue',
				sfc('<p class="transition-color md:transition-move" />'),
			),
		).toBe(0)
		expect(await motionsIn('app/pages/a.vue', sfc('<p class="text-sm font-medium" />'))).toBe(0)
	})

	it('<style> の宣言と @apply を落とす', async () => {
		const style = (css) => `${sfc('<p class="a" />')}\n<style scoped>${css}</style>`
		expect(await motionsIn('app/pages/a.vue', style('.a { transition: all 0.3s; }'))).toBe(1)
		expect(await motionsIn('app/pages/a.vue', style('.a { @apply duration-200; }'))).toBe(1)
		expect(
			await motionsIn('app/pages/a.vue', style('.a { transition: transform 0.2s; }')),
		).toBe(0)
	})
})

describe('制限の抑制', () => {
	const template = '<template><div /></template>'
	const script = (body = '') => `<script setup lang="ts">${body}</script>`
	const style = '<style scoped>.a { margin: 0 !important; }</style>'

	it('案内どおり <style> に書いて <script> で抑制すると消える', async () => {
		expect(
			await importantsIn('app/pages/a.vue', `${template}\n${script()}\n${style}`),
		).toBeGreaterThan(0)
		expect(
			await importantsIn(
				'app/pages/a.vue',
				`${template}\n${script('/* eslint-disable style/no-important -- 第三者由来 */')}\n${style}`,
			),
		).toBe(0)
	})

	it('テンプレートは抑制できない', async () => {
		expect(
			await importantsIn(
				'app/pages/a.vue',
				sfc('<!-- eslint-disable vue/no-restricted-syntax --><div class="!mt-0" />'),
			),
		).toBeGreaterThan(0)
		expect(
			await importantsIn(
				'app/pages/a.vue',
				sfc('<div class="!mt-0" />', '/* eslint-disable vue/no-restricted-syntax */'),
			),
		).toBeGreaterThan(0)
	})

	it('抑制の届く先を変える並びを落とす', async () => {
		expect(
			await blockOrdersIn('app/pages/a.vue', `${script()}\n${template}\n${style}`),
		).toBeGreaterThan(0)
		expect(
			await blockOrdersIn('app/pages/a.vue', `${template}\n${style}\n${script()}`),
		).toBeGreaterThan(0)
		expect(await blockOrdersIn('app/pages/a.vue', `${template}\n${script()}\n${style}`)).toBe(0)
	})
})

describe('ルートファイルの中身', () => {
	const ENTITY = "import AllArticles from './-AllArticles.vue'"
	const ROOT_FILE = 'app/pages/article/index.vue'

	it('実体を描画するだけなら通す', async () => {
		expect(await renderOnlyIn(ROOT_FILE, sfc('<AllArticles />', ENTITY))).toBe(0)
	})

	it('ロジックとマークアップを落とす', async () => {
		expect(
			await renderOnlyIn(
				ROOT_FILE,
				sfc('<AllArticles />', `${ENTITY}\nconst heading = computed(() => 'x')`),
			),
		).toBeGreaterThan(0)
		expect(
			await renderOnlyIn(ROOT_FILE, sfc('<div><h1>x</h1><AllArticles /></div>', ENTITY)),
		).toBeGreaterThan(0)
	})

	it('実体を import しないページは見ない', async () => {
		expect(
			await renderOnlyIn(
				'app/pages/index.vue',
				sfc(
					'<div><Hero /></div>',
					"import Hero from '~/components/article/Hero.vue'\nconst n = 1",
				),
			),
		).toBe(0)
	})
})

describe('標準入力の読み取り', () => {
	const HOOK = '.claude/hooks/a-guard.mjs'

	it('綴りを変えた読み取りも落とす', async () => {
		expect(
			await stdinReadsIn(HOOK, 'for await (const chunk of process.stdin) buf += chunk'),
		).toBeGreaterThan(0)
		expect(await stdinReadsIn(HOOK, "process['stdin'].setEncoding('utf8')")).toBeGreaterThan(0)
		expect(await stdinReadsIn(HOOK, "readFileSync(0, 'utf8')")).toBeGreaterThan(0)
		expect(
			await stdinReadsIn('scripts/a.mjs', "fs.readFileSync('/dev/stdin', 'utf8')"),
		).toBeGreaterThan(0)
	})

	it('束縛で受けた読み取りも落とす', async () => {
		expect(
			await stdinReadsIn(HOOK, "import { stdin as input } from 'node:process'"),
		).toBeGreaterThan(0)
		expect(await stdinReadsIn(HOOK, 'const { stdin } = process')).toBeGreaterThan(0)
	})

	it('集約先そのものと、通して読む側は通す', async () => {
		expect(
			await stdinReadsIn(
				'scripts/stdin.mjs',
				'for await (const chunk of process.stdin) buf += chunk',
			),
		).toBe(0)
		expect(
			await stdinReadsIn(
				HOOK,
				"import { read } from '../../scripts/stdin.mjs'\nawait read()",
			),
		).toBe(0)
		expect(await stdinReadsIn(HOOK, 'readFileSync(path, 0)\nsetTimeout(fn, 0)')).toBe(0)
		expect(await stdinReadsIn(HOOK, 'const { input, encoding } = options')).toBe(0)
	})
})

describe('記事のクエリの公開制御', () => {
	const query = (chain) =>
		`const { data } = await useAsyncData('articles', () => queryCollection('article')${chain})`

	const MISSING = ".order('date', 'DESC').all()"
	const FILTERED = ".where('published', '=', true).all()"

	it('クエリを書く層すべてで落とす', async () => {
		expect(await publishedIn('app/composables/useArticles.ts', query(MISSING))).toBe(1)
		expect(await publishedIn('app/pages/index.vue', sfc('', query(MISSING)))).toBe(1)
		expect(
			await publishedIn('app/components/layout/SearchDialog.vue', sfc('', query(MISSING))),
		).toBe(1)
	})

	it('公開制御の付いた鎖は通す', async () => {
		expect(await publishedIn('app/composables/useArticles.ts', query(FILTERED))).toBe(0)
		expect(await publishedIn('app/pages/index.vue', sfc('', query(FILTERED)))).toBe(0)
	})
})

describe('composable の DOM の組み立て', () => {
	const COMPOSABLE = 'app/composables/useShelf.ts'
	const UTIL = 'app/utils/shelf.ts'

	const body = (statement) =>
		`export const build = (host: HTMLElement, html: string) => {\n${statement}\n}`

	const ASSEMBLIES = {
		生成: "void document.createElement('p')",
		複製: 'void host.cloneNode(true)',
		挿入: 'host.prepend(host.children[0]!)',
		文字列: 'host.innerHTML = html',
	}

	it.each(Object.entries(ASSEMBLIES))('%s の綴りを落とす', async (_label, statement) => {
		expect(await assembliesIn(COMPOSABLE, body(statement))).toBe(1)
		expect(await assembliesIn(UTIL, body(statement))).toBe(1)
	})

	it('document を経由しない組み立ても落とす', async () => {
		expect(await assembliesIn(COMPOSABLE, body('void new Image()'))).toBe(1)
		expect(await assembliesIn(COMPOSABLE, body("host.appendChild(h('p', html))"))).toBe(2)
		expect(await assembliesIn(COMPOSABLE, body("host['appendChild'](new Text(html))"))).toBe(2)
		expect(
			await assembliesIn(COMPOSABLE, body("host.insertAdjacentHTML('beforeend', html)")),
		).toBe(1)
		expect(await assembliesIn(COMPOSABLE, body('host.setHTML(html)'))).toBe(1)
		expect(await assembliesIn(COMPOSABLE, body('document.write(html)'))).toBe(1)
	})

	it('読み取り・購読・フォーカスの移動は通す', async () => {
		expect(await assembliesIn(COMPOSABLE, body('void host.innerHTML'))).toBe(0)
		expect(
			await assembliesIn(
				COMPOSABLE,
				body("void document.getElementById('toc')?.textContent"),
			),
		).toBe(0)
		expect(await assembliesIn(COMPOSABLE, body("void host.querySelectorAll('a').length"))).toBe(
			0,
		)
		expect(
			await assembliesIn(COMPOSABLE, body("document.addEventListener('click', () => {})")),
		).toBe(0)
		expect(
			await assembliesIn(
				COMPOSABLE,
				body("host.setAttribute('data-open', html)\nhost.focus()"),
			),
		).toBe(0)
	})

	it('要素を受け取らない append は通す', async () => {
		expect(await assembliesIn(UTIL, body("new URLSearchParams().append('page', html)"))).toBe(0)
		expect(await assembliesIn(UTIL, body("new FormData().append('body', html)"))).toBe(0)
	})

	it('テンプレートを持つ層と、対象を組み立てるテストでは落とさない', async () => {
		expect(
			await assembliesIn(
				'app/components/article/Toc.vue',
				sfc('', body('host.innerHTML = html')),
			),
		).toBe(0)
		expect(
			await assembliesIn(
				'tests/app/composables/useShelf.test.ts',
				body('host.innerHTML = html'),
			),
		).toBe(0)
		expect(
			await assembliesIn('tests/app/utils/shelf.test.ts', body("host.appendChild(h('p'))")),
		).toBe(0)
	})
})
