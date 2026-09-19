// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollDirection } from '~/composables/useScrollDirection'
import { useScrollTo } from '~/composables/useScrollTo'
import { withSetup } from './withSetup.test-helper'

const mounted: Array<() => void> = []

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

// scroll が来てからフレームが走るまでを1つにまとめる。読み取りはフレームでしか走らない
const scrollTo = (y: number) => {
	setScrollY(y)
	window.dispatchEvent(new Event('scroll'))
	runFrame()
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
	// 送りの追従はモジュールスコープに残る。止めずに終わると、次のテストが送っている最中から始まる
	while (frames.size > 0) runFrame()

	for (const unmount of mounted.splice(0)) unmount()
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

	it('送っている間の移動は、下へ運んでいても下向きにしない', () => {
		const { direction } = mountDirection(10)

		scrollTo(50)
		expect(direction.value).toBe('down')

		// 下の見出しへ送っている間も下向きのままだと、着地の時点で隠す側が消えている
		useScrollTo().scrollTo('target')
		scrollTo(2000)

		expect(direction.value).toBe('up')
	})
})
