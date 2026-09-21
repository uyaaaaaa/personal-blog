// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { releaseBackdrop, useBackdropInert } from '~/composables/useBackdropInert'

const mounted: Array<() => void> = []

// happy-dom は箱を持たず getClientRects が常に空なので、見えているかどうかは自分で持たせる
const boxed = (element: HTMLElement, shown: boolean) => {
	Object.defineProperty(element, 'getClientRects', {
		value: () => (shown ? [{}] : []),
		configurable: true,
	})
}

const frame = () => new Promise((done) => requestAnimationFrame(() => done(undefined)))

// 背面は被せたものと別の枝に置く。同じ枝に置くと、unmount で背面ごと文書から外れる
const mountBackdrop = () => {
	const isOpen = ref(false)

	const behind = document.createElement('div')
	behind.className = 'behind'
	behind.append(document.createElement('a'))
	document.body.append(behind)

	const wrapper = mount(
		defineComponent({
			setup: () => {
				const trapRef = ref<HTMLElement | null>(null)

				useBackdropInert(isOpen, trapRef)

				return () =>
					h(
						'div',
						{ class: 'page' },
						h(
							'div',
							{ class: 'overlay' },
							h('div', { ref: trapRef, class: 'trap' }, h('button', 'close')),
						),
					)
			},
		}),
		{ attachTo: document.body },
	)

	mounted.push(() => {
		wrapper.unmount()
		behind.remove()
	})

	const find = (selector: string) =>
		selector === '.behind' ? behind : (wrapper.get(selector).element as HTMLElement)

	const trap = find('.trap')
	boxed(trap, true)

	const open = async (value: boolean) => {
		isOpen.value = value
		await nextTick()
	}

	return {
		open,
		trap,
		behind,
		cross: async (shown: boolean) => {
			boxed(trap, shown)
			window.dispatchEvent(new Event('resize'))
			await frame()
		},
		inert: (selector: string) => find(selector).hasAttribute('inert'),
		unmount: () => wrapper.unmount(),
	}
}

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
	releaseBackdrop()
})

describe('useBackdropInert', () => {
	it('被せている間、祖先の兄弟だけを inert にする', async () => {
		const backdrop = mountBackdrop()
		await backdrop.open(true)

		expect(backdrop.inert('.behind')).toBe(true)
		expect(backdrop.inert('.overlay')).toBe(false)
		expect(backdrop.inert('.trap')).toBe(false)
		expect(backdrop.inert('.trap button')).toBe(false)
	})

	it('閉じると背面を戻す', async () => {
		const backdrop = mountBackdrop()
		await backdrop.open(true)
		await backdrop.open(false)

		expect(backdrop.inert('.behind')).toBe(false)
	})

	// 幅を跨いで被せたものが display で消えても isOpen は残る。外したままだと行き先が無くなる
	it('被せたものが箱を持たなくなったら背面を戻す', async () => {
		const backdrop = mountBackdrop()
		await backdrop.open(true)
		await backdrop.cross(false)

		expect(backdrop.inert('.behind')).toBe(false)

		await backdrop.cross(true)

		expect(backdrop.inert('.behind')).toBe(true)
	})

	it('releaseBackdrop は開いたままでも背面を戻す', async () => {
		const backdrop = mountBackdrop()
		await backdrop.open(true)

		releaseBackdrop()

		expect(backdrop.inert('.behind')).toBe(false)
	})

	it('開いたまま unmount しても背面を残さない', async () => {
		const backdrop = mountBackdrop()
		await backdrop.open(true)
		backdrop.unmount()

		expect(backdrop.behind.hasAttribute('inert')).toBe(false)
	})
})
