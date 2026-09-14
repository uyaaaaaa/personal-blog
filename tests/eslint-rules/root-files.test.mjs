import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { describe, it } from 'vitest'
import rootFiles from '~~/eslint-rules/root-files.mjs'

const vue = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
	},
})

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const file = (relative) => path.join(ROOT, relative)

const sfc = (template, script = '', style = '') =>
	`<template>\n${template}\n</template>\n\n<script setup lang="ts">\n${script}\n</script>\n${style}`

const IMPORT_ENTITY = "import AllArticles from './-AllArticles.vue'"
const IMPORT_NATIVE_NAME = "import Main from './-Main.vue'"
const IMPORT_ENTITY_ABSOLUTE = "import AllArticles from '~/pages/article/-AllArticles.vue'"

const ROOT_FILE = file('app/pages/article/index.vue')
const PAGED_ROOT_FILE = file('app/pages/article/page/[page].vue')
const PAGE = file('app/pages/index.vue')

describe('render-only', () => {
	it('実体を描画するだけのルートファイルを通す', () => {
		vue.run('render-only', rootFiles.rules['render-only'], {
			valid: [
				{ filename: ROOT_FILE, code: sfc('\t<AllArticles />', `\t${IMPORT_ENTITY}`) },
				{
					filename: PAGED_ROOT_FILE,
					code: sfc('\t<AllArticles />', `\t${IMPORT_ENTITY_ABSOLUTE}`),
				},
				{ filename: ROOT_FILE, code: sfc('\t<all-articles />', `\t${IMPORT_ENTITY}`) },
				{ filename: ROOT_FILE, code: sfc('\t<Main />', `\t${IMPORT_NATIVE_NAME}`) },
			],
			invalid: [],
		})
	})

	it('ルートファイルのロジックを落とす', () => {
		vue.run('render-only', rootFiles.rules['render-only'], {
			invalid: [
				{
					filename: ROOT_FILE,
					code: sfc(
						'\t<AllArticles />',
						`\t${IMPORT_ENTITY}\n\n\tconst heading = computed(() => 'すべての記事')`,
					),
					errors: [{ messageId: 'logic' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<AllArticles />', `\t${IMPORT_ENTITY}\n\n\tdefinePageMeta({})`),
					errors: [{ messageId: 'logic' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<AllArticles v-if="ready" />', `\t${IMPORT_ENTITY}`),
					errors: [{ messageId: 'logic' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc(
						'\t<AllArticles />',
						"\tconst AllArticles = defineAsyncComponent(() => import('./-AllArticles.vue'))",
					),
					errors: [{ messageId: 'logic' }],
				},
			],
			valid: [],
		})
	})

	it('ルートファイルのマークアップを落とす', () => {
		vue.run('render-only', rootFiles.rules['render-only'], {
			invalid: [
				{
					filename: ROOT_FILE,
					code: sfc(
						'\t<div>\n\t\t<h1>すべての記事</h1>\n\t\t<AllArticles />\n\t</div>',
						`\t${IMPORT_ENTITY}`,
					),
					errors: [{ messageId: 'markup' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<h1>すべての記事</h1>\n\t<AllArticles />', `\t${IMPORT_ENTITY}`),
					errors: [{ messageId: 'markup' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<AllArticles>すべての記事</AllArticles>', `\t${IMPORT_ENTITY}`),
					errors: [{ messageId: 'markup' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<AllArticles class="mx-auto" />', `\t${IMPORT_ENTITY}`),
					errors: [{ messageId: 'markup' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<AllArticles />\n\t<AllArticles />', `\t${IMPORT_ENTITY}`),
					errors: [{ messageId: 'markup' }],
				},
				{
					filename: ROOT_FILE,
					code: sfc('\t<main />', `\t${IMPORT_NATIVE_NAME}`),
					errors: [{ messageId: 'markup' }],
				},
			],
			valid: [],
		})
	})

	it('ルートファイルの style ブロックを落とす', () => {
		vue.run('render-only', rootFiles.rules['render-only'], {
			invalid: [
				{
					filename: ROOT_FILE,
					code: sfc(
						'\t<AllArticles />',
						`\t${IMPORT_ENTITY}`,
						'\n<style>\n\t.page {\n\t\tmargin: 0;\n\t}\n</style>\n',
					),
					errors: [{ messageId: 'block' }],
				},
			],
			valid: [],
		})
	})

	it('実体を持たないページは見ない', () => {
		vue.run('render-only', rootFiles.rules['render-only'], {
			valid: [
				{
					filename: PAGE,
					code: sfc(
						'\t<div>\n\t\t<Hero />\n\t</div>',
						"\timport Hero from '~/components/article/Hero.vue'\n\n\tconst count = 1",
					),
				},
				{
					filename: file('app/pages/article/-AllArticles.vue'),
					code: sfc(
						'\t<section>\n\t\t<ArticleRow />\n\t</section>',
						"\timport ArticleRow from '~/components/article/ArticleRow.vue'\n\n\tconst route = useRoute()",
					),
				},
			],
			invalid: [],
		})
	})
})
