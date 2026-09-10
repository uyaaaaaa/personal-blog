// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isProgrammaticScroll } from '~/composables/useProgrammaticScroll'
import { useScrollDirection } from '~/composables/useScrollDirection'
import { withSetup } from './withSetup.test-helper'

const mounted: Array<() => void> = []

const frames = new Map<number, FrameRequestCallback>()
let lastFrameId = 0

const setScrollY = (y: number) => {
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}

// scroll が来てからフレームが走るまでを1つにまとめる。読み取りはフレームでしか走らない
const scrollTo = (y: number) => {
	setScrollY(y)
	window.dispatchEvent(new Event('scroll'))

	const callbacks = [...frames.values()]
	frames.clear()
	for (const callback of callbacks) callback(0)
}

const mountDirection = (threshold: number, startY = 0) => {
	setScrollY(startY)
	const { result, unmount } = withSetup(() => useScrollDirection(threshold, ref(true)))
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
})

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
	isProgrammaticScroll.value = false
	vi.unstubAllGlobals()
})

describe('useScrollDirection', () => {
	it('途中まで読まれた状態で始まっても、最初の読み取りでは方向を決めない', () => {
		const { direction } = mountDirection(10, 500)

		expect(direction.value).toBe('up')
	})

	it('threshold 以上進んだら方向を更新する', () => {
		const { direction } = mountDirection(10)

		scrollTo(50)
		expect(direction.value).toBe('down')

		scrollTo(20)
		expect(direction.value).toBe('up')
	})

	it('threshold 未満の移動は、積み上がって超えるまで無視する', () => {
		const { direction } = mountDirection(10)

		scrollTo(5)
		expect(direction.value).toBe('up')

		scrollTo(9)
		expect(direction.value).toBe('up')

		scrollTo(10)
		expect(direction.value).toBe('down')
	})

	it('scrollY が負に振れても 0 として持ち、戻りを下向きと読まない', () => {
		const { direction } = mountDirection(10)

		// ラバーバンドで負まで行った位置をそのまま覚えると、0 付近に戻るだけで下向きになる
		scrollTo(-100)
		scrollTo(5)

		expect(direction.value).toBe('up')
	})

	it('プログラムスクロール中は、上に動いていても down にする', () => {
		const { direction } = mountDirection(10, 100)

		isProgrammaticScroll.value = true
		scrollTo(0)

		expect(direction.value).toBe('down')
	})

	it('プログラムスクロールが終われば、そこを基準に方向を読み直す', () => {
		const { direction } = mountDirection(10, 100)

		isProgrammaticScroll.value = true
		scrollTo(500)
		isProgrammaticScroll.value = false

		scrollTo(480)
		expect(direction.value).toBe('up')
	})
})
