import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const eslint = new ESLint({ cwd: ROOT })

const WEB_FONT = /Web フォントを読み込まない/
const THEME_BRANCH = /dark: で色を分岐しない|prefers-color-scheme で分岐しない/
const LANDING = /着地位置は CSS が持つ|scroll-behavior は宣言しない/

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
