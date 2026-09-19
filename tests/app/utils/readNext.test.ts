import { describe, expect, it } from 'vitest'
import { readNextArticles } from '~/utils/readNext'

const article = (path: string, category = 'blog') => ({ path, category })

const blog = ['/b0', '/b1', '/b2', '/b3'].map((path) => article(path))

describe('readNextArticles', () => {
	it('同じカテゴリの1つ古い記事から順に返す', () => {
		expect(readNextArticles(blog, '/b1', 3).map((it) => it.path)).toEqual(['/b2', '/b3', '/b0'])
	})

	it('一番古い記事では新しい側を近い順に返す', () => {
		expect(readNextArticles(blog, '/b3', 3).map((it) => it.path)).toEqual(['/b2', '/b1', '/b0'])
	})

	it('いま読んでいる記事を返さない', () => {
		expect(readNextArticles(blog, '/b0', 4).map((it) => it.path)).not.toContain('/b0')
	})

	it('同じカテゴリで足りない分を他のカテゴリの新しい順で埋める', () => {
		const articles = [article('/k0', 'book'), ...blog]

		expect(readNextArticles(articles, '/k0', 2).map((it) => it.path)).toEqual(['/b0', '/b1'])
	})

	it('同じカテゴリを他のカテゴリより先に返す', () => {
		const articles = [article('/k0', 'book'), article('/b0'), article('/k1', 'book')]

		expect(readNextArticles(articles, '/k0', 3).map((it) => it.path)).toEqual(['/k1', '/b0'])
	})

	it('limit で切る', () => {
		expect(readNextArticles(blog, '/b0', 2)).toHaveLength(2)
	})

	it('候補が自分しか無ければ空にする', () => {
		expect(readNextArticles([article('/b0')], '/b0', 3)).toEqual([])
	})

	it('一覧に無いパスでは新しい順に返す', () => {
		expect(readNextArticles(blog, '/draft', 2).map((it) => it.path)).toEqual(['/b0', '/b1'])
	})
})
