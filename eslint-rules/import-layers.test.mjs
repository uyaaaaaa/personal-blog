import tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { describe, it } from 'vitest'
import importLayers from './import-layers.mjs'

const vue = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
	},
})

const ts = new RuleTester({
	languageOptions: {
		parser: tsParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
})

const sfc = (...imports) =>
	`<template><div /></template>\n<script setup lang="ts">\n${imports.join('\n')}\n</script>`

const PAGE = 'app/pages/index.vue'
const COMPONENT = 'app/components/article/Hero.vue'

describe('order', () => {
	it('自作モジュールの並びがコンポーネント → composable → util のものだけを通す', () => {
		vue.run('order', importLayers.rules.order, {
			valid: [
				{
					filename: PAGE,
					code: sfc(
						"import Hero from '~/components/article/Hero.vue'",
						"import { usePageSeo } from '~/composables/usePageSeo'",
						"import { buildShelves } from '~/utils/shelf'",
					),
				},
				// 同じ層の中の並びは見ない
				{
					filename: COMPONENT,
					code: sfc(
						"import { useTocActive } from '~/composables/useTocActive'",
						"import { useIsDesktop } from '~/composables/useIsDesktop'",
					),
				},
				// 相対パスは import する側から辿る
				{
					filename: 'app/components/content/ProseH2.vue',
					code: sfc(
						"import HeadingAnchor from './HeadingAnchor.vue'",
						"import { useScrollTo } from '~/composables/useScrollTo'",
					),
				},
				// ページ配下の実体コンポーネントもコンポーネント
				{
					filename: 'app/pages/article/page/[page].vue',
					code: sfc(
						"import AllArticles from '~/pages/article/-AllArticles.vue'",
						"import { formatDate } from '~/utils/date'",
					),
				},
				// 外部パッケージとリポジトリ直下は並びを見ない
				{
					filename: PAGE,
					code: sfc(
						"import { buildShelves } from '~/utils/shelf'",
						"import { sizes } from '~~/theme/tokens'",
						"import { computed } from 'vue'",
					),
				},
			],
			invalid: [
				{
					filename: PAGE,
					code: sfc(
						"import { buildShelves } from '~/utils/shelf'",
						"import Hero from '~/components/article/Hero.vue'",
					),
					errors: [{ messageId: 'order' }],
				},
				{
					filename: PAGE,
					code: sfc(
						"import { usePageSeo } from '~/composables/usePageSeo'",
						"import Hero from '~/components/article/Hero.vue'",
					),
					errors: [{ messageId: 'order' }],
				},
				{
					filename: PAGE,
					code: sfc(
						"import { buildShelves } from '~/utils/shelf'",
						"import { usePageSeo } from '~/composables/usePageSeo'",
					),
					errors: [{ messageId: 'order' }],
				},
				// 並びを丸ごと逆にすると、後ろの2本がどちらも上の util より前に来る
				{
					filename: PAGE,
					code: sfc(
						"import { buildShelves } from '~/utils/shelf'",
						"import { usePageSeo } from '~/composables/usePageSeo'",
						"import ArticleShelf from '~/components/article/ArticleShelf.vue'",
					),
					errors: [{ messageId: 'order' }, { messageId: 'order' }],
				},
				// 間に挟まる外部パッケージは並びを崩さない
				{
					filename: COMPONENT,
					code: sfc(
						"import { formatDate } from '~/utils/date'",
						"import { sizes } from '~~/theme/tokens'",
						"import BackButton from '~/components/common/BackButton.vue'",
					),
					errors: [{ messageId: 'order' }],
				},
				{
					filename: 'app/components/content/ProseH2.vue',
					code: sfc(
						"import { useScrollTo } from '~/composables/useScrollTo'",
						"import HeadingAnchor from './HeadingAnchor.vue'",
					),
					errors: [{ messageId: 'order' }],
				},
			],
		})
	})

	it('.ts でも同じ並びを見る', () => {
		ts.run('order', importLayers.rules.order, {
			valid: [
				{
					filename: 'app/composables/useArticleTags.ts',
					code: "import { countTags } from '~/utils/tag'",
				},
				{
					filename: 'app/composables/useScrollDirection.ts',
					code: "import { useScrollFrame } from './useScrollFrame'\nimport { tagToSlug } from '~/utils/tag'",
				},
				{
					filename: 'app/utils/shelf.test.ts',
					code: "import { describe } from 'vitest'\nimport { buildShelves } from './shelf'",
				},
			],
			invalid: [
				{
					filename: 'app/composables/usePagination.ts',
					code: "import { pageLink } from '~/utils/pagination'\nimport { useTocActive } from './useTocActive'",
					errors: [{ messageId: 'order' }],
				},
				// 型だけの import も1本と数える
				{
					filename: 'app/components/article/ArticleCard.test.ts',
					code: "import { formatDate } from '~/utils/date'\nimport type { Props } from './ArticleCard.vue'",
					errors: [{ messageId: 'order' }],
				},
			],
		})
	})
})
