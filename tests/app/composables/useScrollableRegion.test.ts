// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useScrollableRegion } from '~/composables/useScrollableRegion'
import { stubResizeObserver } from '~~/tests/app/resizeObserver.test-helper'
import { withSetup } from './withSetup.test-helper'

const mounted: Array<() => void> = []
let observer: ReturnType<typeof stubResizeObserver>

beforeEach(() => {
	observer = stubResizeObserver()
})

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
	observer.restore()
	document.body.replaceChildren()
})

const widths = (element: HTMLElement, scrollWidth: number, clientWidth: number) => {
	Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true })
	Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true })
}

const region = (scrollWidth: number, clientWidth: number) => {
	const element = document.createElement('div')
	const content = document.createElement('table')
	element.append(content)
	document.body.append(element)
	widths(element, scrollWidth, clientWidth)

	const host = ref<HTMLElement | null>(element)
	const { result, unmount } = withSetup(() => useScrollableRegion(host, 'Table'))
	mounted.push(unmount)

	return { element, content, result, unmount }
}

const TABLE = { tabindex: 0, role: 'group', 'aria-label': 'Table' }

describe('useScrollableRegion', () => {
	it('溢れている箱をタブ順に入れ、読み上げる名前を付ける', () => {
		expect(region(600, 300).result.value).toEqual(TABLE)
	})

	it('溢れていない箱には何も付けない', () => {
		expect(region(300, 300).result.value).toEqual({})
	})

	it('丸めで出る 1px の差では停止を作らない', () => {
		expect(region(301, 300).result.value).toEqual({})
	})

	it('箱の幅が変わって溢れたらタブ順に入れる', () => {
		const { element, result } = region(300, 300)

		widths(element, 300, 100)
		observer.resize(element)

		expect(result.value).toEqual(TABLE)
	})

	it('中身の幅が変わって溢れたらタブ順に入れる', () => {
		const { element, content, result } = region(300, 300)

		widths(element, 600, 300)
		observer.resize(content)

		expect(result.value).toEqual(TABLE)
	})

	it('読んでいる箱は、溢れが消えてもタブ順に残す', () => {
		const { element, result } = region(600, 300)

		element.setAttribute('tabindex', '0')
		element.focus()
		widths(element, 300, 300)
		observer.resize(element)

		expect(result.value).toEqual(TABLE)
	})

	it('読み終えて焦点が外れたら、残していた停止を畳む', () => {
		const { element, result } = region(600, 300)

		element.setAttribute('tabindex', '0')
		element.focus()
		widths(element, 300, 300)
		observer.resize(element)
		element.blur()

		expect(result.value).toEqual({})
	})

	it('外した後は幅が変わっても読まない', () => {
		const { element, result, unmount } = region(300, 300)

		unmount()
		widths(element, 600, 300)
		observer.resize()

		expect(result.value).toEqual({})
	})
})
