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
})

const widths = (element: HTMLElement, scrollWidth: number, clientWidth: number) => {
	Object.defineProperty(element, 'scrollWidth', { value: scrollWidth, configurable: true })
	Object.defineProperty(element, 'clientWidth', { value: clientWidth, configurable: true })
}

const region = (scrollWidth: number, clientWidth: number) => {
	const element = document.createElement('div')
	widths(element, scrollWidth, clientWidth)

	const host = ref<HTMLElement | null>(element)
	const { result, unmount } = withSetup(() => useScrollableRegion(host, 'Table'))
	mounted.push(unmount)

	return { element, result }
}

describe('useScrollableRegion', () => {
	it('溢れている箱をタブ順に入れ、読み上げる名前を付ける', () => {
		expect(region(600, 300).result.value).toEqual({
			tabindex: 0,
			role: 'group',
			'aria-label': 'Table',
		})
	})

	it('溢れていない箱には何も付けない', () => {
		expect(region(300, 300).result.value).toEqual({})
	})

	it('幅が変わって溢れたらタブ順に入れる', () => {
		const { element, result } = region(300, 300)

		widths(element, 300, 100)
		observer.resize()

		expect(result.value).toEqual({ tabindex: 0, role: 'group', 'aria-label': 'Table' })
	})
})
