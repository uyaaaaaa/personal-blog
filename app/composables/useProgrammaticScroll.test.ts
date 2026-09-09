// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginProgrammaticScroll, isProgrammaticScroll } from './useProgrammaticScroll'

// 実装が「150ms 止まったら落ち着いた」と決めている。手前と直後の両方を測る
const SETTLE_MS = 150

const scroll = () => {
	window.dispatchEvent(new Event('scroll'))
	vi.advanceTimersToNextFrame()
}

let addEventListener: ReturnType<typeof vi.spyOn>
let removeEventListener: ReturnType<typeof vi.spyOn>

const countCalls = (spy: ReturnType<typeof vi.spyOn>, type: string) =>
	spy.mock.calls.filter((call) => call[0] === type).length

beforeEach(() => {
	vi.useFakeTimers()
	addEventListener = vi.spyOn(window, 'addEventListener')
	removeEventListener = vi.spyOn(window, 'removeEventListener')
})

afterEach(() => {
	// モジュールに残るタイマーと購読を落として、次のテストを素の状態から始める
	vi.advanceTimersByTime(SETTLE_MS * 2)
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('beginProgrammaticScroll', () => {
	it('呼んだ時点で立てる', () => {
		beginProgrammaticScroll()

		expect(isProgrammaticScroll.value).toBe(true)
	})

	it('スクロールが一度も起きなくても倒れる', () => {
		beginProgrammaticScroll()

		vi.advanceTimersByTime(SETTLE_MS)

		expect(isProgrammaticScroll.value).toBe(false)
	})

	it('落ち着いたと決める手前では倒さない', () => {
		beginProgrammaticScroll()

		vi.advanceTimersByTime(SETTLE_MS - 1)

		expect(isProgrammaticScroll.value).toBe(true)
	})

	it('スクロールが続くうちは数え直し、止まってから倒す', () => {
		beginProgrammaticScroll()

		scroll()
		vi.advanceTimersByTime(SETTLE_MS - 1)

		expect(isProgrammaticScroll.value).toBe(true)

		vi.advanceTimersByTime(1)

		expect(isProgrammaticScroll.value).toBe(false)
	})

	it('倒れたら読み取りも外し、以後のスクロールでは立てない', () => {
		beginProgrammaticScroll()
		vi.advanceTimersByTime(SETTLE_MS)

		expect(countCalls(removeEventListener, 'scroll')).toBe(1)

		scroll()
		vi.advanceTimersByTime(SETTLE_MS)

		expect(isProgrammaticScroll.value).toBe(false)
	})

	it('自前で購読せず、useScrollFrame の1本に相乗りする', () => {
		beginProgrammaticScroll()
		beginProgrammaticScroll()
		beginProgrammaticScroll()

		expect(countCalls(addEventListener, 'scroll')).toBe(1)
		expect(countCalls(addEventListener, 'resize')).toBe(1)
	})
})
