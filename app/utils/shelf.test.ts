import { describe, expect, it } from 'vitest'
import { buildShelves } from './shelf'

const article = (path: string, category?: string) => ({ path, category })

const blog = (count: number, prefix = 'b') =>
	Array.from({ length: count }, (_, index) => article(`/article/${prefix}${index}`, 'blog'))

describe('buildShelves', () => {
	it('CATEGORIES の並びで、表示名を付けた棚にする', () => {
		const shelves = buildShelves([article('/a', 'book'), article('/b', 'blog')], undefined, 6)

		expect(shelves.map((shelf) => [shelf.category, shelf.title])).toEqual([
			['blog', 'Blog'],
			['book', 'Books'],
		])
	})

	it('ヒーローの記事を棚から外す', () => {
		const shelves = buildShelves(blog(3), '/article/b0', 6)

		expect(shelves[0]?.articles.map((a) => a.path)).toEqual(['/article/b1', '/article/b2'])
	})

	it('ヒーローを外して0枚になった棚を落とす', () => {
		const shelves = buildShelves([article('/a', 'book'), ...blog(2)], '/a', 6)

		expect(shelves.map((shelf) => shelf.category)).toEqual(['blog'])
	})

	it('total はヒーローと切り詰めた分を含むカテゴリの全件数にする', () => {
		const shelves = buildShelves(blog(8), '/article/b0', 6)

		expect(shelves[0]?.total).toBe(8)
		expect(shelves[0]?.articles).toHaveLength(6)
	})

	it('ヒーローを外してから limit で切り詰める', () => {
		const shelves = buildShelves(blog(8), '/article/b0', 6)

		expect(shelves[0]?.articles.map((a) => a.path)).toEqual([
			'/article/b1',
			'/article/b2',
			'/article/b3',
			'/article/b4',
			'/article/b5',
			'/article/b6',
		])
	})

	it('ヒーローが無いときは何も外さない', () => {
		const shelves = buildShelves(blog(3), undefined, 6)

		expect(shelves[0]?.articles).toHaveLength(3)
		expect(shelves[0]?.total).toBe(3)
	})

	it('渡された並びを棚の中でも保つ', () => {
		const shelves = buildShelves(
			[article('/c', 'blog'), article('/a', 'blog'), article('/b', 'blog')],
			undefined,
			6,
		)

		expect(shelves[0]?.articles.map((a) => a.path)).toEqual(['/c', '/a', '/b'])
	})

	it('カテゴリが無い記事と知らないカテゴリの記事を無視する', () => {
		const shelves = buildShelves([article('/x'), article('/y', 'diary')], undefined, 6)

		expect(shelves).toEqual([])
	})

	it('記事が無ければ棚も無い', () => {
		expect(buildShelves([], undefined, 6)).toEqual([])
	})
})
