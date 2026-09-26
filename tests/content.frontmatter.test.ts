import { describe, expect, it } from 'vitest'
import { readFrontMatter } from '../content.frontmatter'
import { articleSchema } from '../content.schema'
import { articleFiles } from '../scripts/article-files.mjs'

const md = (...lines: string[]) => `---\n${lines.join('\n')}\n---\n\n## 見出し\n`

describe('readFrontMatter', () => {
	it.each([
		[
			'重複したキー',
			md('title: 集めたもの', 'published: false', 'published: true'),
			'4行目: Map keys must be unique',
		],
		[
			'タブで字下げした行',
			md('title: 集めたもの', 'tags:', '\t- nuxt'),
			'4行目: Tabs are not allowed as indentation',
		],
		[
			'閉じていない引用符',
			md('title: "集めたもの', 'date: 2026-09-12'),
			'3行目: Missing closing "quote',
		],
		[
			'解決できないタグ',
			md('title: !foo 集めたもの', 'date: 2026-09-12'),
			'2行目: Unresolved tag: !foo',
		],
	])('%s は復元した値を返さず、行と理由を出して投げる', (_, body, reason) => {
		expect(() => readFrontMatter(body)).toThrow(reason)
	})

	it('解決できない alias も投げる', () => {
		expect(() => readFrontMatter(md('title: *missing', 'date: 2026-09-12'))).toThrow(
			'Unresolved alias',
		)
	})

	it('壊れていない YAML はそのまま読む', () => {
		expect(
			readFrontMatter(md('title: "a: b # c"', 'date: 2026-09-12', 'tags:', '  - nuxt')),
		).toEqual({ title: 'a: b # c', date: '2026-09-12', tags: ['nuxt'] })
	})

	// remark-mdc は行頭の `---` を閉じと見るので、後ろの綴りも改行の種類も揃っていない
	it.each([
		['CRLF で揃ったもの', '---\r\ntitle: a\r\ndate: 2026-09-12\r\n---\r\n\r\n## 見出し\r\n'],
		['改行の種類が混ざったもの', '---\r\ntitle: a\r\ndate: 2026-09-12\r\n---\n\n## 見出し\n'],
		['閉じの後ろに空白があるもの', '---\ntitle: a\ndate: 2026-09-12\n--- \n\n## 見出し\n'],
		[
			'CRLF で最後が引用符のもの',
			'---\r\ndate: 2026-09-12\r\ntitle: "a"\r\n---\r\n\r\n## 見出し\r\n',
		],
		[
			'CRLF で最後が空行のもの',
			'---\r\ntitle: a\r\ndate: 2026-09-12\r\n\r\n---\r\n\r\n## 見出し\r\n',
		],
	])('%s も、閉じと行末を剥がして通す', (_, body) => {
		expect(readFrontMatter(body)).toEqual({ title: 'a', date: '2026-09-12' })
	})

	it('フロントマターの無い本文は空で返す', () => {
		expect(readFrontMatter('## 見出し\n')).toEqual({})
	})

	it('いまある記事は通る', () => {
		const { files, read } = articleFiles()
		expect(files.length).toBeGreaterThan(0)

		for (const name of files) {
			const body = read(name)
			if (body === undefined) throw new Error(`${name} not found`)
			const data = readFrontMatter(body)
			expect(articleSchema.safeParse(data).success, name).toBe(true)
		}
	})
})
