// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollTo } from '~/composables/useScrollTo'

// useScrollTo が読む OS の設定
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const frames = new Map<number, FrameRequestCallback>()
let lastFrameId = 0

const jumps: (boolean | ScrollIntoViewOptions | undefined)[] = []
const tops: (ScrollToOptions | undefined)[] = []

const setReducedMotion = (matches: boolean) => {
	const matchMedia = vi.fn((media: string) => ({
		media,
		matches: matches && media === REDUCED_MOTION_QUERY,
	}))
	vi.stubGlobal('matchMedia', matchMedia)
	Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true })
}

const setScrollY = (y: number) => {
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}

const runFrame = () => {
	const callbacks = [...frames.values()]
	frames.clear()
	for (const callback of callbacks) callback(0)
}

const runFrames = (count: number) => {
	for (let i = 0; i < count; i++) runFrame()
}

beforeEach(() => {
	frames.clear()
	lastFrameId = 0
	jumps.length = 0
	tops.length = 0
	setScrollY(0)
	setReducedMotion(false)
	document.body.innerHTML = '<div id="target"></div>'
	const target = document.getElementById('target')
	if (target) {
		target.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
			jumps.push(options)
		}
	}
	vi.stubGlobal('scrollTo', (options?: ScrollToOptions) => {
		tops.push(options)
	})
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		frames.set(++lastFrameId, callback)
		return lastFrameId
	})
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames.delete(id)
	})
})

afterEach(() => {
	// 送りの追従はモジュールスコープに残る。止めずに終わると、次のテストが送っている最中から始まる
	while (frames.size > 0) runFrame()

	vi.unstubAllGlobals()
})

describe('useScrollTo', () => {
	it('滑り込みが止まるまで送っている扱いにする', () => {
		const { scrollTo, isJumping } = useScrollTo()

		scrollTo('target')
		expect(isJumping.value).toBe(true)

		for (const y of [100, 200, 300, 400, 500, 600]) {
			setScrollY(y)
			runFrame()
		}
		expect(isJumping.value).toBe(true)

		runFrames(6)
		expect(isJumping.value).toBe(false)
	})

	it('既定では滑らかに送る', () => {
		const { scrollTo, scrollToTop } = useScrollTo()

		scrollTo('target')
		scrollToTop()

		expect(jumps).toEqual([{ behavior: 'smooth' }])
		expect(tops).toEqual([{ top: 0, behavior: 'smooth' }])
	})

	it('動きを減らす設定では瞬時に着ける', () => {
		setReducedMotion(true)
		const { scrollTo, scrollToTop } = useScrollTo()

		scrollTo('target')
		scrollToTop()

		expect(jumps).toEqual([{ behavior: 'auto' }])
		expect(tops).toEqual([{ top: 0, behavior: 'auto' }])
	})
})
