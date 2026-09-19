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

	// 見出しへ送るのも下向きの移動になる。読者が下へスクロールしたと読むと、
	// 送っている最中に吸着した帯が引っ込み、着地したときに帯1本ぶんの空きが出る
	it('自分で送っている間は、読者の向きが無い状態に戻す', () => {
		const { direction } = mountDirection(10)

		const target = document.createElement('div')
		target.id = 'section'
		target.scrollIntoView = () => {}
		document.body.append(target)

		scrollTo(50)
		expect(direction.value).toBe('down')

		useScrollTo().scrollTo('section')
		scrollTo(400)

		expect(direction.value).toBe('up')

		window.dispatchEvent(new Event('scrollend'))

		scrollTo(500)
		expect(direction.value).toBe('down')

		target.remove()
	})

	it('scrollY が負に振れても 0 として持ち、戻りを下向きと読まない', () => {
		const { direction } = mountDirection(10)

		// ラバーバンドで負まで行った位置をそのまま覚えると、0 付近に戻るだけで下向きになる
		scrollTo(-100)
		scrollTo(5)

		expect(direction.value).toBe('up')
	})
})
