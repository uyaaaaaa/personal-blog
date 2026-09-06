// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

const mounted: Array<() => void> = []

// 末尾の1つは visibility で隠してあり、Tab の行き先は last になる
const mountTrap = (isOpen: Ref<boolean> = ref(false)) => {
	const wrapper = mount(
		defineComponent({
			setup: () => {
				const { trapRef } = useFocusTrap(isOpen)

				return () =>
					h('div', [
						h('button', { class: 'outside' }, 'outside'),
						h('div', { ref: trapRef, class: 'trap' }, [
							h('button', { class: 'first' }, 'first'),
							h('button', { class: 'last' }, 'last'),
							h('button', { class: 'hidden', style: 'visibility: hidden' }, 'hidden'),
						]),
					])
			},
		}),
		{ attachTo: document.body },
	)

	mounted.push(() => wrapper.unmount())

	const find = (selector: string) => wrapper.get(selector).element as HTMLElement

	return {
		isOpen,
		trap: find('.trap'),
		first: find('.first'),
		last: find('.last'),
		outside: find('.outside'),
	}
}

const mountOpenTrap = async () => {
	const trap = mountTrap()
	trap.isOpen.value = true
	await nextTick()

	return trap
}

const pressTab = ({ shiftKey } = { shiftKey: false }) => {
	const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
	window.dispatchEvent(event)
	return event
}

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
})

describe('useFocusTrap', () => {
	it('最後の要素からの Tab は先頭に戻す', async () => {
		const { first, last } = await mountOpenTrap()
		last.focus()

		expect(pressTab().defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(first)
	})

	it('先頭からの Shift+Tab は最後に戻す', async () => {
		const { first, last } = await mountOpenTrap()
		first.focus()

		expect(pressTab({ shiftKey: true }).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(last)
	})

	it('外に当たっているフォーカスは中に引き込む', async () => {
		const { first, outside } = await mountOpenTrap()
		outside.focus()

		pressTab()

		expect(document.activeElement).toBe(first)
	})

	it('端でなければブラウザの移動に任せる', async () => {
		const { first } = await mountOpenTrap()
		first.focus()

		expect(pressTab().defaultPrevented).toBe(false)
	})

	// happy-dom はレイアウトを持たず display: none でも箱が取れるので、
	// 幅が md を跨いでドロワーごと消えた状態は自分で作る
	it('行き先が1つも無ければ Tab を横取りしない', async () => {
		const { trap, outside } = await mountOpenTrap()
		for (const button of trap.querySelectorAll('button')) {
			button.getClientRects = () => [] as unknown as DOMRectList
		}
		outside.focus()

		expect(pressTab().defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(outside)
	})

	it('閉じている間は Tab を横取りしない', async () => {
		const { isOpen, last, outside } = await mountOpenTrap()
		isOpen.value = false
		await nextTick()
		outside.focus()

		expect(pressTab().defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(outside)

		last.focus()

		expect(pressTab().defaultPrevented).toBe(false)
	})
})
