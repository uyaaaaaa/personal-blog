// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollTo } from '~/composables/useScrollTo'

const frames = new Map<number, FrameRequestCallback>()
let lastFrameId = 0

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
	setScrollY(0)
	document.body.innerHTML = '<div id="target"></div>'
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		frames.set(++lastFrameId, callback)
		return lastFrameId
	})
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames.delete(id)
	})
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('useScrollTo', () => {
	it('滑り込みが止まるまで送っている扱いにする', () => {
		const { scrollTo, isJumping } = useScrollTo()

		scrollTo('target')
		expect(isJumping.value).toBe(true)

		// 動いている間は、止まったとみなすフレーム数を超えても下ろさない
		for (const y of [100, 200, 300, 400, 500, 600]) {
			setScrollY(y)
			runFrame()
		}
		expect(isJumping.value).toBe(true)

		runFrames(6)
		expect(isJumping.value).toBe(false)
	})
})
