// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTouchScrollLock } from '~/composables/useTouchScrollLock'

const mounted: Array<() => void> = []

// happy-dom は箱を持たず scrollHeight も clientHeight も 0 なので、
// 「中身があふれているスクローラ」は自分で作る
const overflow = (element: HTMLElement, scrollHeight: number, clientHeight: number) => {
	Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true })
	Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true })
}

const mountLock = () => {
	const wrapper = mount(
		defineComponent({
			setup: () => {
				const { lockRef } = useTouchScrollLock()

				return () =>
					h('div', { ref: lockRef, class: 'overlay', style: 'overflow: hidden' }, [
						h('div', { class: 'field' }, [h('input', { class: 'input' })]),
						h(
							'ul',
							{ class: 'scroller', style: 'overflow-y: auto' },
							h('li', { class: 'row' }, 'row'),
						),
						h('ul', { class: 'short', style: 'overflow-y: auto' }, 'short'),
					])
			},
		}),
		{ attachTo: document.body },
	)

	mounted.push(() => wrapper.unmount())

	const find = (selector: string) => wrapper.get(selector).element as HTMLElement

	const overlay = find('.overlay')
	const scroller = find('.scroller')

	overflow(scroller, 400, 100)
	overflow(find('.short'), 40, 100)

	return {
		overlay,
		scroller,
		row: find('.row'),
		field: find('.field'),
		input: find('.input'),
		short: find('.short'),
		unmount: () => wrapper.unmount(),
	}
}

// happy-dom に TouchEvent が無いので、判定に使う分だけ持たせた touchmove を送る。
// cancelable でない event は preventDefault を呼んでも defaultPrevented が立たず、
// 触ったかどうかが結果に出ない。呼ばれたこと自体を見る
const touchMove = (from: HTMLElement, { fingers = 1, cancelable = true } = {}) => {
	const event = new Event('touchmove', { bubbles: true, cancelable })
	Object.defineProperty(event, 'touches', { value: new Array(fingers).fill({}) })
	const preventDefault = vi.fn(event.preventDefault.bind(event))
	event.preventDefault = preventDefault
	from.dispatchEvent(event)

	return {
		prevented: preventDefault.mock.calls.length > 0,
		defaultPrevented: event.defaultPrevented,
	}
}

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
})

describe('useTouchScrollLock', () => {
	it('被せた側の外枠に来た指は止める', () => {
		const { overlay } = mountLock()

		expect(touchMove(overlay)).toEqual({ prevented: true, defaultPrevented: true })
	})

	it('スクロールしない中身に来た指も止める', () => {
		const { field, input } = mountLock()

		expect(touchMove(field).prevented).toBe(true)
		expect(touchMove(input).prevented).toBe(true)
	})

	it('あふれているスクローラの上は止めない', () => {
		const { scroller, row } = mountLock()

		expect(touchMove(scroller).prevented).toBe(false)
		expect(touchMove(row).prevented).toBe(false)
	})

	it('あふれていないスクローラは止める', () => {
		const { short } = mountLock()

		expect(touchMove(short).prevented).toBe(true)
	})

	it('指が2本のときは止めない', () => {
		const { overlay } = mountLock()

		expect(touchMove(overlay, { fingers: 2 }).prevented).toBe(false)
	})

	it('cancelable でない touchmove には触らない', () => {
		const { overlay } = mountLock()

		expect(touchMove(overlay, { cancelable: false }).prevented).toBe(false)
	})

	it('unmount の後は止めない', () => {
		const { overlay, unmount } = mountLock()
		unmount()

		expect(touchMove(overlay).prevented).toBe(false)
	})
})
