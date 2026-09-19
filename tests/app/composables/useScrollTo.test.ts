// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollTo } from '~/composables/useScrollTo'

const { scrollTo, scrollToTop, isSending } = useScrollTo()

const scrollIntoView = vi.fn()

let target: HTMLElement

beforeEach(() => {
	vi.useFakeTimers()

	scrollIntoView.mockReset()
	target = document.createElement('div')
	target.id = 'section'
	target.scrollIntoView = scrollIntoView
	document.body.append(target)

	window.scrollTo = vi.fn()
})

afterEach(() => {
	vi.runAllTimers()
	vi.useRealTimers()
	target.remove()
})

describe('useScrollTo', () => {
	it('送っている間だけ、自分で動かしている印を立てる', () => {
		expect(isSending.value).toBe(false)

		scrollTo('section')

		expect(scrollIntoView).toHaveBeenCalled()
		expect(isSending.value).toBe(true)

		window.dispatchEvent(new Event('scrollend'))

		expect(isSending.value).toBe(false)
	})

	// scrollend を出さないブラウザでは、印が立ったまま戻らなくなる
	it('scrollend が来なくても、待ち切ったら印を下ろす', () => {
		scrollTo('section')
		expect(isSending.value).toBe(true)

		vi.runAllTimers()

		expect(isSending.value).toBe(false)
	})

	it('先頭へ戻すときも印を立てる', () => {
		scrollToTop()

		expect(isSending.value).toBe(true)
	})

	it('行き先が無ければ動かさず、印も立てない', () => {
		scrollTo('missing')

		expect(scrollIntoView).not.toHaveBeenCalled()
		expect(isSending.value).toBe(false)
	})
})
