// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
const BOTTOM = PAGE - VIEWPORT

const mounted: Array<() => void> = []

const frames = new Map<number, FrameRequestCallback>()
let lastFrameId = 0

// happy-dom はレイアウトを持たず top が常に 0 になるので、見出しごとに直接与える。
// スクロールで動く値なので、要素ではなくこの表を正本にして読ませる
const tops: Record<string, number> = {}

const placeHeadings = (initial: Record<string, number>) => {
	document.body.innerHTML = ''
	for (const id of Object.keys(tops)) delete tops[id]
	Object.assign(tops, initial)

	for (const id of Object.keys(initial)) {
		const heading = document.createElement('h2')
		heading.id = id
		heading.getBoundingClientRect = () => ({ top: tops[id] ?? 0 }) as DOMRect
		document.body.append(heading)
	}
}

const setScrollY = (y: number) => {
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}

// 見出しを動かしてフレームまで走らせる。読み取りはフレームの中でしか起きない
const scroll = (moved: Record<string, number>, y = 0) => {
	Object.assign(tops, moved)
	setScrollY(y)
	window.dispatchEvent(new Event('scroll'))

	const callbacks = [...frames.values()]
	frames.clear()
	for (const callback of callbacks) callback(0)
}

const mountToc = (links: TocLink[]) => {
	const { result, unmount } = withSetup(() => useTocActive(ref(links), OFFSET, ref(true)))
	mounted.push(unmount)
	return result
}

beforeEach(() => {
	frames.clear()
	lastFrameId = 0
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		frames.set(++lastFrameId, callback)
		return lastFrameId
	})
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames.delete(id)
	})

	Object.defineProperty(window, 'innerHeight', { value: VIEWPORT, configurable: true })
	Object.defineProperty(document.documentElement, 'scrollHeight', {
		value: PAGE,
		configurable: true,
	})
	setScrollY(0)
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

		scroll({ a: -800, b: -450, c: -200 })

		expect(activeId.value).toBe('c')
	})

	it('offset ちょうどに乗った見出しも、超えたものとして選ぶ', () => {
		// 目次のリンクを踏んで着地した直後がこの位置になる
		placeHeadings({ a: -300, b: OFFSET, c: 300 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'b', text: 'B' },
			{ id: 'c', text: 'C' },
		])

		expect(activeId.value).toBe('b')
	})

	it('選んだ後に見出しが offset より下へ戻ったら、選択を外す', () => {
		placeHeadings({ a: -300, b: 500 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('a')

		scroll({ a: 300, b: 1100 })

		expect(activeId.value).toBe('')
	})

	it('children も並びに含めて選ぶ', () => {
		placeHeadings({ a: -300, 'a-1': 500, b: 900 })

		const { activeId } = mountToc([
			{ id: 'a', text: 'A', children: [{ id: 'a-1', text: 'A-1' }] },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('a')

		scroll({ 'a-1': -50, b: 400 })

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

		const { activeId } = mountToc([
			{ id: 'a', text: 'A' },
			{ id: 'b', text: 'B' },
		])

		expect(activeId.value).toBe('a')

		scroll({ b: 500 }, BOTTOM)

		expect(activeId.value).toBe('b')
	})

	it('最下部でも、見出しが1つも無ければ何も選ばない', () => {
		placeHeadings({})
		setScrollY(BOTTOM)

		const { activeId } = mountToc([])

		expect(activeId.value).toBe('')
	})
})
