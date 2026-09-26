import { afterEach, describe, expect, it, vi } from 'vitest'
import { remoteCollection, type RemoteStore } from '../content.source'

const VALID = [
	'title: 集めたもの',
	'date: 2026-09-12',
	'source: https://github.com/yamadashy/tech-blog-rss-feed',
]

const md = (...lines: string[]) => `---\n${lines.join('\n')}\n---\n\n## 見出し\n`

const MANIFEST = '{}'

const storeOf = (items: Record<string, string>): RemoteStore => ({
	list: async () => Object.keys(items),
	get: async (key) => {
		const item = items[key]
		if (item === undefined) throw new Error(`${key} が無い`)
		return item
	},
})

const source = (store: RemoteStore) => remoteCollection(store)

afterEach(() => {
	vi.restoreAllMocks()
})

describe('getKeys', () => {
	it('マニフェストのある回の収集物だけを渡し、マニフェスト自体は渡さない', async () => {
		const store = storeOf({
			'digest/2026-09-12/first.md': md(...VALID),
			'digest/2026-09-12/_manifest.json': MANIFEST,
			'digest/2026-09-13/half.md': md(...VALID),
		})

		await expect(source(store).getKeys!()).resolves.toEqual(['digest/2026-09-12/first.md'])
	})

	it.each([
		['JSON として読めない', '{'],
		['オブジェクトでない', '[]'],
	])('マニフェストが%s回は、他の回を残して落とす', async (_, manifest) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const store = storeOf({
			'digest/2026-09-12/first.md': md(...VALID),
			'digest/2026-09-12/_manifest.json': MANIFEST,
			'digest/2026-09-13/broken.md': md(...VALID),
			'digest/2026-09-13/_manifest.json': manifest,
		})

		await expect(source(store).getKeys!()).resolves.toEqual(['digest/2026-09-12/first.md'])
		expect(warn.mock.calls.flat().join('\n')).toContain('digest/2026-09-13/_manifest.json')
	})

	it('マニフェストを取得できない回は、他の回を残して落とす', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const items = storeOf({ 'digest/2026-09-12/first.md': md(...VALID) })
		const store: RemoteStore = {
			list: async () => [
				'digest/2026-09-12/first.md',
				'digest/2026-09-12/_manifest.json',
				'digest/2026-09-13/lost.md',
				'digest/2026-09-13/_manifest.json',
			],
			get: async (key) => {
				if (key === 'digest/2026-09-12/_manifest.json') return MANIFEST
				if (key === 'digest/2026-09-13/_manifest.json') throw new Error('R2 に届かない')
				return items.get(key)
			},
		}

		await expect(source(store).getKeys!()).resolves.toEqual(['digest/2026-09-12/first.md'])
		expect(warn.mock.calls.flat().join('\n')).toContain('R2 に届かない')
	})

	it('取得が丸ごと失敗しても投げず、空の collection にする', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const store: RemoteStore = {
			list: async () => {
				throw new Error('R2 に届かない')
			},
			get: async () => '',
		}

		await expect(source(store).getKeys!()).resolves.toEqual([])
		expect(warn.mock.calls.flat().join('\n')).toContain('R2 に届かない')
	})
})

describe('getItem', () => {
	it('スキーマに合う1件は本文をそのまま渡す', async () => {
		const body = md(...VALID)
		const store = storeOf({ 'digest/2026-09-12/first.md': body })

		await expect(source(store).getItem!('digest/2026-09-12/first.md')).resolves.toBe(body)
	})

	const SCHEMA = 'フロントマターがスキーマに合わない'
	const UNREADABLE = 'フロントマターを読み取れない'

	it.each([
		['スキーマに無い項目', md(...VALID, 'category: blog'), SCHEMA],
		['項目の型が違う', md('title: 集めたもの', 'date: 2026/09/12'), SCHEMA],
		['項目が足りない', md('title: 集めたもの', 'date: 2026-09-12'), SCHEMA],
		[
			'出典が URL でない',
			md('title: 集めたもの', 'date: 2026-09-12', 'source: 企業テックブログRSS'),
			SCHEMA,
		],
		['フロントマターが無い', '## 見出し\n', SCHEMA],
		[
			'壊れた YAML が別の型に復元される',
			md('title: [閉じていない', 'date: 2026-09-12'),
			UNREADABLE,
		],
		['YAML を読み取れない', md('title: *missing', 'date: 2026-09-12'), UNREADABLE],
		[
			'重複したキー',
			md('title: 集めたもの', 'date: 2026-09-11', 'date: 2026-09-12'),
			UNREADABLE,
		],
		['タブで字下げした行', md('title: 集めたもの', 'date:', '\t- 2026-09-12'), UNREADABLE],
	])('%s 1件は落とし、キーと理由を1行で出す', async (_, body, reason) => {
		const store = storeOf({ 'digest/2026-09-12/broken.md': body })

		await expect(source(store).getItem!('digest/2026-09-12/broken.md')).rejects.toThrow(
			new RegExp(`^digest/2026-09-12/broken\\.md: ${reason}[^\\n]*$`),
		)
	})

	it('取得できない1件は落とし、他のキーには波及しない', async () => {
		const store = storeOf({ 'digest/2026-09-12/first.md': md(...VALID) })
		const { getItem } = source(store)

		await expect(getItem!('digest/2026-09-12/missing.md')).rejects.toThrow('が無い')
		await expect(getItem!('digest/2026-09-12/first.md')).resolves.toContain('集めたもの')
	})

	it('スキーマに合わない1件が混ざっても、合う分は残る', async () => {
		const store = storeOf({
			'digest/2026-09-12/first.md': md(...VALID),
			'digest/2026-09-12/broken.md': md('title: 集めたもの', 'category: blog'),
			'digest/2026-09-12/second.md': md(...VALID),
			'digest/2026-09-12/_manifest.json': MANIFEST,
		})
		const { getKeys, getItem } = source(store)

		const results = await Promise.allSettled((await getKeys!()).map((key) => getItem!(key)))

		expect(results.map((result) => result.status)).toEqual([
			'fulfilled',
			'rejected',
			'fulfilled',
		])
	})
})
