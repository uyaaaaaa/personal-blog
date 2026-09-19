// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { isScreenReaderOnly, shouldJumpToHeading } from '~/utils/heading'

const clickOn = (html: string, selector: string) => {
	const heading = document.createElement('h2')
	heading.innerHTML = html

	return { target: heading.querySelector(selector) } as unknown as MouseEvent
}

const selection = (isCollapsed: boolean) => ({ isCollapsed }) as Selection

describe('shouldJumpToHeading', () => {
	it('見出しの文字を押したら移動する', () => {
		expect(shouldJumpToHeading(clickOn('<span>見出し</span>', 'span'), selection(true))).toBe(
			true,
		)
	})

	it.each([
		['節のアイコン', '<a href="#section"><svg></svg></a>', 'svg'],
		['本文中のリンク', '見出しの<a href="/article">リンク</a>', 'a'],
	])('見出しの中の %s を押したら移動しない', (_name, html, selector) => {
		expect(shouldJumpToHeading(clickOn(html, selector), selection(true))).toBe(false)
	})

	it('文字を選んだ直後は移動しない', () => {
		expect(shouldJumpToHeading(clickOn('<span>見出し</span>', 'span'), selection(false))).toBe(
			false,
		)
	})

	it('選択が取れない環境では移動する', () => {
		expect(shouldJumpToHeading(clickOn('<span>見出し</span>', 'span'), null)).toBe(true)
	})
})

describe('isScreenReaderOnly', () => {
	it.each([['sr-only'], ['group relative sr-only'], ['sr-only group']])(
		'%s は画面に出ない見出しとして見る',
		(className) => {
			expect(isScreenReaderOnly(className)).toBe(true)
		},
	)

	// 綴りが重なるだけのクラスまで拾うと、出ている見出しからアイコンが消える
	it.each([['group relative'], ['not-sr-only'], ['sr-only-label'], [undefined]])(
		'%s は画面に出る見出しとして見る',
		(className) => {
			expect(isScreenReaderOnly(className)).toBe(false)
		},
	)
})
