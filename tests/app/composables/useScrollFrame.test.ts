// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readOnScrollFrame, useScrollFrame } from '~/composables/useScrollFrame'
import { withSetup } from './withSetup.test-helper'

// 購読とフレームはモジュールスコープに持たれる。全員 unmount すれば購読が外れて素に戻るので、
// モジュールを入れ直さずに、後片付けそのものを測る形にする
const mounted: Array<() => void> = []
const stopped: Array<() => void> = []

const mountFrame = (read: () => void, enabled = ref(true)) => {
	const { unmount } = withSetup(() => useScrollFrame(read, enabled))
	mounted.push(unmount)
	return { enabled, unmount }
}

const startRead = (read: () => void) => {
	const stop = readOnScrollFrame(read)
	stopped.push(stop)
	return stop
}

const frames = new Map<number, FrameRequestCallback>()
let lastFrameId = 0

const runFrame = () => {
	const callbacks = [...frames.values()]
	frames.clear()
	for (const callback of callbacks) callback(0)
}

let addEventListener: ReturnType<typeof vi.spyOn>
let removeEventListener: ReturnType<typeof vi.spyOn>

const countCalls = (spy: ReturnType<typeof vi.spyOn>, type: string) =>
	spy.mock.calls.filter((call) => call[0] === type).length

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

	addEventListener = vi.spyOn(window, 'addEventListener')
	removeEventListener = vi.spyOn(window, 'removeEventListener')
})

afterEach(() => {
	for (const stop of stopped.splice(0)) stop()
	for (const unmount of mounted.splice(0)) unmount()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('useScrollFrame', () => {
	it('購読を始めた時点で1回読む', () => {
		const read = vi.fn()
		mountFrame(read)

		expect(read).toHaveBeenCalledTimes(1)
	})

	it('enabled が false のままなら読まず、購読もしない', () => {
		const read = vi.fn()
		mountFrame(read, ref(false))

		expect(read).not.toHaveBeenCalled()
		expect(countCalls(addEventListener, 'scroll')).toBe(0)
	})

	it('購読者が何人いても scroll と resize の購読は1本ずつにする', () => {
		mountFrame(vi.fn())
		mountFrame(vi.fn())
		mountFrame(vi.fn())

		expect(countCalls(addEventListener, 'scroll')).toBe(1)
		expect(countCalls(addEventListener, 'resize')).toBe(1)
	})

	it('1フレームに何度 scroll や resize が来ても読むのは1回', () => {
		const read = vi.fn()
		mountFrame(read)
		read.mockClear()

		window.dispatchEvent(new Event('scroll'))
		window.dispatchEvent(new Event('scroll'))
		window.dispatchEvent(new Event('resize'))

		expect(frames.size).toBe(1)

		runFrame()

		expect(read).toHaveBeenCalledTimes(1)
	})

	it('フレームが走り終われば次の scroll でまた読む', () => {
		const read = vi.fn()
		mountFrame(read)
		read.mockClear()

		window.dispatchEvent(new Event('scroll'))
		runFrame()
		window.dispatchEvent(new Event('scroll'))
		runFrame()

		expect(read).toHaveBeenCalledTimes(2)
	})

	it('enabled を false にすると、その読み取りだけが外れる', async () => {
		const off = vi.fn()
		const on = vi.fn()
		const { enabled } = mountFrame(off)
		mountFrame(on)

		enabled.value = false
		await nextTick()

		off.mockClear()
		on.mockClear()
		window.dispatchEvent(new Event('scroll'))
		runFrame()

		expect(off).not.toHaveBeenCalled()
		expect(on).toHaveBeenCalledTimes(1)
	})

	it('読み取りが残っているうちは購読を外さない', async () => {
		const { enabled } = mountFrame(vi.fn())
		mountFrame(vi.fn())

		enabled.value = false
		await nextTick()

		expect(countCalls(removeEventListener, 'scroll')).toBe(0)
	})

	it('購読者が0になったら購読を外し、予約したフレームも取り消す', () => {
		const { unmount } = mountFrame(vi.fn())

		window.dispatchEvent(new Event('scroll'))
		expect(frames.size).toBe(1)

		unmount()

		expect(countCalls(removeEventListener, 'scroll')).toBe(1)
		expect(countCalls(removeEventListener, 'resize')).toBe(1)
		expect(frames.size).toBe(0)
	})

	it('全員が外れた後にまた購読者が来たら購読し直す', () => {
		const { unmount } = mountFrame(vi.fn())
		unmount()
		addEventListener.mockClear()

		mountFrame(vi.fn())

		expect(countCalls(addEventListener, 'scroll')).toBe(1)
	})
})

describe('readOnScrollFrame', () => {
	it('登録した時点で1回読み、以後はフレームごとに読む', () => {
		const read = vi.fn()
		startRead(read)

		expect(read).toHaveBeenCalledTimes(1)

		window.dispatchEvent(new Event('scroll'))
		runFrame()

		expect(read).toHaveBeenCalledTimes(2)
	})

	it('コンポーネントの読み取りと購読を分け合う', () => {
		mountFrame(vi.fn())
		startRead(vi.fn())

		expect(countCalls(addEventListener, 'scroll')).toBe(1)
		expect(countCalls(addEventListener, 'resize')).toBe(1)
	})

	it('止めるとその読み取りだけが外れる', () => {
		const stopping = vi.fn()
		const staying = vi.fn()
		const stop = startRead(stopping)
		startRead(staying)

		stop()
		stopping.mockClear()
		staying.mockClear()

		window.dispatchEvent(new Event('scroll'))
		runFrame()

		expect(stopping).not.toHaveBeenCalled()
		expect(staying).toHaveBeenCalledTimes(1)
	})

	it('最後の1つを止めたら購読も外れる', () => {
		const stop = startRead(vi.fn())

		stop()

		expect(countCalls(removeEventListener, 'scroll')).toBe(1)
		expect(countCalls(removeEventListener, 'resize')).toBe(1)
	})
})
