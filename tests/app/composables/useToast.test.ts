// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '~/composables/useToast'

const { message, isVisible, show } = useToast()

afterEach(() => {
	vi.useRealTimers()
	isVisible.value = false
	message.value = ''
})

describe('useToast', () => {
	it('出した文面を見せ、しばらくすると引っ込む', () => {
		vi.useFakeTimers()

		show('Link copied')

		expect(message.value).toBe('Link copied')
		expect(isVisible.value).toBe(true)

		vi.runAllTimers()

		expect(isVisible.value).toBe(false)
	})

	// 消える時刻を持ち越すと、2回目が出てすぐ引っ込む
	it('引っ込む前に出し直したら、そこから数え直す', () => {
		vi.useFakeTimers()

		show('Link copied')
		vi.advanceTimersByTime(1500)
		show('Link copied')
		vi.advanceTimersByTime(1500)

		expect(isVisible.value).toBe(true)
	})
})
