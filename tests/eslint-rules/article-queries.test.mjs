import tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import { describe, it } from 'vitest'
import articleQueries from '~~/eslint-rules/article-queries.mjs'

const ts = new RuleTester({
	languageOptions: {
		parser: tsParser,
		parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	},
})

const run = (cases) => ts.run('published', articleQueries.rules.published, cases)

const runLocation = (cases) => ts.run('location', articleQueries.rules.location, cases)

const QUERY = "queryCollection('article').where('published', '=', true).all()"

const at = (filename, code = QUERY) => ({ filename, code })
const notAt = (filename, code = QUERY) => ({ filename, code, errors: [{ messageId: 'location' }] })

describe('published', () => {
	it('公開制御を継いだ鎖を通す', () => {
		run({
			valid: [
				"queryCollection('article').where('published', '=', true).select('tags').all()",
				"queryCollection('article').path(path).where('published', '=', true).first()",
				"queryCollectionNavigation('article').where('published', '=', true)",
				"queryCollection('article').andWhere((group) => group.where('published', '=', true)).all()",
				"queryCollection('article').andWhere((group) => group.andWhere((it) => it.where('published', '=', true))).all()",
				'articles.filter(isRecent).slice(0, 3)',
			],
			invalid: [],
		})
	})

	it('公開制御を欠いた鎖を落とす', () => {
		run({
			valid: [],
			invalid: [
				{
					code: "queryCollection('article').select('tags').all()",
					errors: [{ messageId: 'published' }],
				},
				{
					code: "queryCollection('article').order('date', 'DESC').limit(3).all()",
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})

	it('collection を引く別の綴りも落とす', () => {
		run({
			valid: [],
			invalid: [
				{
					code: "queryCollectionNavigation('article')",
					errors: [{ messageId: 'published' }],
				},
				{
					code: "queryCollectionItemSurroundings('article', path)",
					errors: [{ messageId: 'published' }],
				},
				{
					code: "queryCollectionSearchSections('article')",
					errors: [{ messageId: 'published' }],
				},
				{ code: 'queryCollection(name).all()', errors: [{ messageId: 'published' }] },
			],
		})
	})

	it('記事でない collection を名指した鎖は通し、名指していないものは落とす', () => {
		run({
			valid: [
				"queryCollection('digest').order('date', 'DESC').all()",
				"queryCollection('digest').path(path).first()",
				"queryCollectionNavigation('digest')",
			],
			invalid: [
				{ code: 'queryCollection(collection).all()', errors: [{ messageId: 'published' }] },
				{
					code: 'queryCollection(`article`).all()',
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})

	it('値として書いた published では通さない', () => {
		run({
			valid: [],
			invalid: [
				{
					code: "queryCollection('article').where('category', '=', 'published').all()",
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})

	it('群の中に書いた別の条件では通さない', () => {
		run({
			valid: [],
			invalid: [
				{
					code: "queryCollection('article').andWhere((group) => group.where('category', '=', 'blog')).all()",
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})

	it('OR の群に入れた公開制御では通さない', () => {
		run({
			valid: [],
			invalid: [
				{
					code: "queryCollection('article').orWhere((group) => group.where('published', '=', true).where('category', '=', 'blog')).all()",
					errors: [{ messageId: 'published' }],
				},
				{
					code: "queryCollection('article').orWhere((group) => group.andWhere((it) => it.where('published', '=', true))).all()",
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})

	it('表明を挟んだ鎖も、公開制御があれば通す', () => {
		run({
			valid: [
				"queryCollection('article')!.where('published', '=', true).all()",
				"(queryCollection('article') as never).where('published', '=', true).all()",
				"queryCollection('article')!.andWhere((group) => group.where('published', '=', true)).all()",
			],
			invalid: [
				{
					code: "queryCollection('article')!.order('date', 'DESC').all()",
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})

	it('鎖を変数で分けたものを落とす', () => {
		run({
			valid: [],
			invalid: [
				{
					code: "const articles = queryCollection('article')\nawait articles.where('published', '=', true).all()",
					errors: [{ messageId: 'published' }],
				},
			],
		})
	})
})

describe('location', () => {
	it('置き場に書いた取得を通す', () => {
		runLocation({
			valid: [
				at('app/utils/articleQuery.ts'),
				at('app/utils/articleQuery.ts', "queryCollectionNavigation('article')"),
				at('app/utils/articleQuery.ts', "queryCollectionItemSurroundings('article', path)"),
				at('app/utils/articleQuery.ts', "queryCollectionSearchSections('article')"),
				at('app/utils/articleQuery.ts', 'queryCollection(name).all()'),
				at('app/utils/article/query.ts'),
			],
			invalid: [],
		})
	})

	it('置き場の外に書いた取得を落とす', () => {
		runLocation({
			valid: [],
			invalid: [
				notAt('app/composables/usePublishedArticles.ts'),
				notAt('app/pages/index.vue'),
				notAt('app/pages/article/-AllArticles.vue'),
				notAt('app/components/article/ArticleShelf.vue'),
				notAt('app/layouts/default.vue'),
			],
		})
	})

	it('置き場の外では、collection を引く別の綴りも落とす', () => {
		runLocation({
			valid: [],
			invalid: [
				notAt('app/pages/index.vue', "queryCollectionNavigation('article')"),
				notAt('app/pages/index.vue', "queryCollectionItemSurroundings('article', path)"),
				notAt('app/pages/index.vue', "queryCollectionSearchSections('article')"),
				notAt('app/pages/index.vue', 'queryCollection(collection).all()'),
				notAt('app/pages/index.vue', 'queryCollection(`article`).all()'),
			],
		})
	})

	it('置き場の名前を前方に含むだけのディレクトリは置き場に数えない', () => {
		runLocation({
			valid: [],
			invalid: [notAt('app/utilsx/query.ts'), notAt('tests/app/utils/articleQuery.test.ts')],
		})
	})

	it('記事でない collection を名指した取得は、どこでも通す', () => {
		runLocation({
			valid: [
				at(
					'app/pages/digest/index.vue',
					"queryCollection('digest').order('date', 'DESC').all()",
				),
				at('app/pages/digest/index.vue', "queryCollectionNavigation('digest')"),
				at('app/pages/index.vue', 'publishedArticleList().all()'),
			],
			invalid: [],
		})
	})
})
