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
