import { describe, expect, it } from 'vitest'
import { deltaToCenter, deltaToCenterIfHidden, deltaToReveal, type Box } from '~/utils/scroll'

const box = (top: number, height: number): Box => ({ top, bottom: top + height, height })

// 器は 0〜200、項目の高さは 20
const container = box(0, 200)

describe('deltaToReveal', () => {
	it('器の中に収まっていれば動かさない', () => {
		expect(deltaToReveal(container, box(0, 20))).toBe(0)
		expect(deltaToReveal(container, box(90, 20))).toBe(0)
		expect(deltaToReveal(container, box(180, 20))).toBe(0)
	})

	it('上にはみ出した分だけ戻す', () => {
		expect(deltaToReveal(container, box(-30, 20))).toBe(-30)
	})

	it('下にはみ出した分だけ送る', () => {
		expect(deltaToReveal(container, box(190, 20))).toBe(10)
	})
})

describe('deltaToCenter', () => {
	it('器の中に収まっていても中央に寄せる', () => {
		expect(deltaToCenter(container, box(90, 20))).toBe(0)
		expect(deltaToCenter(container, box(0, 20))).toBe(-90)
		expect(deltaToCenter(container, box(180, 20))).toBe(90)
	})
})

describe('deltaToCenterIfHidden', () => {
	it('器の中に収まっていれば動かさない', () => {
		expect(deltaToCenterIfHidden(container, box(0, 20))).toBe(0)
		expect(deltaToCenterIfHidden(container, box(180, 20))).toBe(0)
	})

	it('はみ出していれば中央に寄せる', () => {
		expect(deltaToCenterIfHidden(container, box(-30, 20))).toBe(-120)
		expect(deltaToCenterIfHidden(container, box(190, 20))).toBe(100)
	})
})
