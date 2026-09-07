// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { useTouchScrollLock } from './useTouchScrollLock'

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

// happy-dom に TouchEvent が無いので、判定に使う分だけ持たせた touchmove を送る
const touchMove = (from: HTMLElement, { fingers = 1, cancelable = true } = {}) => {
	const event = new Event('touchmove', { bubbles: true, cancelable })
	Object.defineProperty(event, 'touches', { value: new Array(fingers).fill({}) })
	from.dispatchEvent(event)

	return event
}

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
})

describe('useTouchScrollLock', () => {
	it('被せた側の外枠に来た指は止める', () => {
		const { overlay } = mountLock()

		expect(touchMove(overlay).defaultPrevented).toBe(true)
	})

	it('スクロールしない中身に来た指も止める', () => {
		const { field, input } = mountLock()

		expect(touchMove(field).defaultPrevented).toBe(true)
		expect(touchMove(input).defaultPrevented).toBe(true)
	})

	it('あふれているスクローラの上は止めない', () => {
		const { scroller, row } = mountLock()

		expect(touchMove(scroller).defaultPrevented).toBe(false)
		expect(touchMove(row).defaultPrevented).toBe(false)
	})

	it('あふれていないスクローラは止める', () => {
		const { short } = mountLock()

		expect(touchMove(short).defaultPrevented).toBe(true)
	})

	it('指が2本のときは止めない', () => {
		const { overlay } = mountLock()

		expect(touchMove(overlay, { fingers: 2 }).defaultPrevented).toBe(false)
	})

	it('cancelable でない touchmove には触らない', () => {
		const { overlay } = mountLock()

		expect(touchMove(overlay, { cancelable: false }).defaultPrevented).toBe(false)
	})

	it('unmount の後は止めない', () => {
		const { overlay, unmount } = mountLock()
		unmount()

		expect(touchMove(overlay).defaultPrevented).toBe(false)
	})
})
