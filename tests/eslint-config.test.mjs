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
const SINGLE_SOURCE = /色の直値|書体の名前|fontFamily が持つ名前のクラス/
const RENDER_ONLY = /ルートファイルは実体コンポーネント/

// 落ちる理由が他のルールに移っても気づけるよう、Web フォントの指摘だけを数える
const webFontsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => WEB_FONT.test(message.message)).length
}

// 同じく、テーマ分岐の指摘だけを数える
const themeBranchesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => THEME_BRANCH.test(message.message)).length
}

// 同じく、着地位置の指摘だけを数える
const landingsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => LANDING.test(message.message)).length
}

// 同じく、フォーカスの輪郭の指摘だけを数える
const outlinesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => OUTLINE.test(message.message)).length
}

// 同じく、!important の指摘だけを数える
const importantsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => IMPORTANT.test(message.message)).length
}

// 同じく、色と書体の指摘だけを数える
const singleSourcesIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => SINGLE_SOURCE.test(message.message)).length
}

// 同じく、実体の描画以外の指摘だけを数える
const renderOnlyIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => RENDER_ONLY.test(message.message)).length
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

	it('静的な style 属性の宣言を落とす', async () => {
		expect(
			await landingsIn('app/pages/a.vue', sfc('<div style="scroll-behavior: smooth" />')),
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

	it('style 属性の宣言を落とす', async () => {
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input style="outline: none" />')),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input :style="{ outlineWidth: 0 }" />')),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input :style="{ outline: \'none\' }" />')),
		).toBeGreaterThan(0)
	})

	it('オブジェクトで書いた :style も同じ値の見方で落とす', async () => {
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(`<input :style="{ outline: '2px solid transparent' }" />`),
			),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(`<input :style="{ outline: '0 solid red' }" />`),
			),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input :style="{ outline: `none` }" />')),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(
					`<input :style="{ outline: on ? 'none' : '2px solid red' }" />`,
					'const on = true',
				),
			),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc(`<input :style="{ outline: 'unset' }" />`)),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(`<input :style="{ outline: '2px solid currentColor' }" />`),
			),
		).toBe(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(`<input :style="{ outlineColor: 'initial' }" />`),
			),
		).toBe(0)
	})

	it('値でない語と、色の中の 0 は通す', async () => {
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input style="outline: 2px solid #0ff" />')),
		).toBe(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(
					`<input :style="{ outlineColor: kind === 'none' ? 'red' : 'blue' }" />`,
					`const kind = 'x'`,
				),
			),
		).toBe(0)
	})

	it('同じ指摘を2件出さない', async () => {
		expect(
			await outlinesIn('app/pages/a.vue', sfc(`<input :style="{ outlineWidth: '0' }" />`)),
		).toBe(1)
	})

	it('all でまとめて初期値に戻す指定も落とす', async () => {
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input style="all: unset" />')),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc(`<input :style="{ all: 'unset' }" />`)),
		).toBeGreaterThan(0)
	})

	it('値そのものでない 0 は通す', async () => {
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(
					`<input :style="{ outline: index === 0 ? '2px solid red' : '3px solid blue' }" />`,
					'const index = 1',
				),
			),
		).toBe(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc(
					`<input :style="{ outline: outlines[0] }" />`,
					`const outlines = ['2px solid red']`,
				),
			),
		).toBe(0)
	})

	it('宣言と同じ判定で style 属性を見る', async () => {
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc('<input style="outline: 2px solid transparent" />'),
			),
		).toBeGreaterThan(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc('<input style="outline: 0.5rem solid currentColor" />'),
			),
		).toBe(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc('<input style="outline: 2px solid rgb(0 0 0)" />'),
			),
		).toBe(0)
		expect(
			await outlinesIn('app/pages/a.vue', sfc('<input style="outline: unset" />')),
		).toBeGreaterThan(0)
	})

	it('輪郭を出す指定と、綴りの重なる指定は通す', async () => {
		expect(await outlinesIn('app/pages/a.vue', sfc('<input class="outline-offset-0" />'))).toBe(
			0,
		)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc('<input style="outline: 2px solid currentColor" />'),
			),
		).toBe(0)
		expect(
			await outlinesIn(
				'app/pages/a.vue',
				sfc('<input style="padding: 0; outline: 2px solid red" />'),
			),
		).toBe(0)
	})
})

describe('色と書体の単一情報源', () => {
	it('style 属性に書いた色と書体を落とす', async () => {
		expect(
			await singleSourcesIn('app/pages/a.vue', sfc('<p style="color: #ff0000" />')),
		).toBeGreaterThan(0)
		expect(
			await singleSourcesIn(
				'app/pages/a.vue',
				sfc(`<p style="font-family: 'Comic Sans MS'" />`),
			),
		).toBeGreaterThan(0)
		expect(
			await singleSourcesIn(
				'app/pages/a.vue',
				sfc(`<p :style="{ color: '#ff0000', fontFamily: 'Comic Sans MS' }" />`),
			),
		).toBe(2)
	})

	it('トークンを引く style 属性は通す', async () => {
		expect(
			await singleSourcesIn(
				'app/pages/a.vue',
				sfc('<p style="color: var(--color-main); font-family: var(--font-mono)" />'),
			),
		).toBe(0)
		expect(
			await singleSourcesIn(
				'app/pages/a.vue',
				sfc(`<p :style="{ '--callout-rgb-light': rgb }" />`, `const rgb = '124, 58, 237'`),
			),
		).toBe(0)
	})

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
