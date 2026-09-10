import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const eslint = new ESLint({ cwd: ROOT })

const WEB_FONT = /Web フォントを読み込まない/

// 落ちる理由が他のルールに移っても気づけるよう、Web フォントの指摘だけを数える
const webFontsIn = async (relative, code) => {
	const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, relative) })
	return result.messages.filter((message) => WEB_FONT.test(message.message)).length
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
