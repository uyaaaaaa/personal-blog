// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useTocActive } from './useTocActive'
import { withSetup } from './withSetup.test-helper'

interface TocLink {
	id: string
	text: string
	children?: TocLink[]
}

const OFFSET = 100
const VIEWPORT = 800
const PAGE = 5000

const mounted: Array<() => void> = []

// happy-dom はレイアウトを持たず top が常に 0 になるので、見出しごとに直接与える
const placeHeadings = (tops: Record<string, number>) => {
	document.body.innerHTML = ''

	for (const [id, top] of Object.entries(tops)) {
		const heading = document.createElement('h2')
		heading.id = id
		heading.getBoundingClientRect = () => ({ top }) as DOMRect
		document.body.append(heading)
	}
}

const scrollTo = (y: number) => {
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}

const mountToc = (links: TocLink[]) => {
	const { result, unmount } = withSetup(() => useTocActive(ref(links), OFFSET, ref(true)))
	mounted.push(unmount)
	return result
}

beforeEach(() => {
	vi.stubGlobal('requestAnimationFrame', () => 1)
	vi.stubGlobal('cancelAnimationFrame', () => {})

	Object.defineProperty(window, 'innerHeight', { value: VIEWPORT, configurable: true })
	Object.defineProperty(document.documentElement, 'scrollHeight', {
		value: PAGE,
		configurable: true,
	})
	scrollTo(0)
})

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
	document.body.innerHTML = ''
	vi.unstubAllGlobals()
})

describe('useTocActive', () => {
	it('上端が offset を超えた見出しのうち、いちばん後ろを選ぶ', () => {
		placeHeadings({ a: -300, b: 50, c: 300 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'b', text: 'B' },
			{ id: 'c', text: 'C' },
		])

		expect(activeId.value).toBe('b')
	})

	it('どの見出しもまだ offset に届いていなければ、何も選ばない', () => {
		placeHeadings({ a: 300, b: 500 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('')
	})

	it('children も並びに含めて選ぶ', () => {
		placeHeadings({ a: -300, 'a-1': -50, b: 500 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A', children: [{ id: 'a-1', text: 'A-1' }] },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('a-1')
	})

	it('本文に無い見出しは飛ばし、そこで打ち切らない', () => {
		placeHeadings({ a: -300, b: -50 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'missing', text: 'Missing' },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('b')
	})

	it('最下部まで来たら、画面に届いていなくても最後の見出しにする', () => {
		placeHeadings({ a: -300, b: 500 })
		scrollTo(PAGE - VIEWPORT)

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('b')
	})

	it('最下部でも、見出しが1つも無ければ何も選ばない', () => {
		placeHeadings({})
		scrollTo(PAGE - VIEWPORT)

		const { activeId } = mountToc([])

		expect(activeId.value).toBe('')
	})
})
