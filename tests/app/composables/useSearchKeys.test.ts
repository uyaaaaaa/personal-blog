// @vitest-environment nuxt
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearchKeys } from '~/composables/useSearchKeys'

const navigate = vi.fn()

mockNuxtImport('navigateTo', () => (path: string) => navigate(path))

const mounted: Array<() => void> = []

const mountKeys = (
	{ canSelect = true, composing = false } = {},
	isTrapped: Ref<boolean> = ref(false),
) => {
	const activeArticle = ref<{ path: string } | undefined>({ path: '/article/vim-abbreviation' })
	const moveActive = vi.fn()
	const close = vi.fn()
	const select = vi.fn()

	let keys: ReturnType<typeof useSearchKeys> | undefined

	const wrapper = mount(
		defineComponent({
			setup: () => {
				keys = useSearchKeys(
					{
						activeArticle,
						moveActive,
						isComposingKey: () => composing,
					},
					{ canSelect: () => canSelect, isTrapped, close, select },
				)

				return () => h('div', { ref: keys!.trapRef })
			},
		}),
		{ attachTo: document.body },
	)

	mounted.push(() => wrapper.unmount())

	return { onKeydown: keys!.onKeydown, activeArticle, moveActive, close, select, isTrapped }
}

const press = (key: string) => new KeyboardEvent('keydown', { key, cancelable: true })

beforeEach(() => navigate.mockClear())

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
})

describe('useSearchKeys', () => {
	it('↑↓ は候補を動かし、キャレットの移動は止める', () => {
		const { onKeydown, moveActive } = mountKeys()

		const down = press('ArrowDown')
		onKeydown(down)
		const up = press('ArrowUp')
		onKeydown(up)

		expect(moveActive.mock.calls).toEqual([[1], [-1]])
		expect(down.defaultPrevented).toBe(true)
		expect(up.defaultPrevented).toBe(true)
	})

	it('Enter は閉じてから選んだ記事へ移る', () => {
		const { onKeydown, close, select } = mountKeys()

		onKeydown(press('Enter'))

		expect(close).toHaveBeenCalledTimes(1)
		expect(select).toHaveBeenCalledWith('/article/vim-abbreviation')
		expect(navigate).toHaveBeenCalledWith('/article/vim-abbreviation')
		const [selectOrder = 0] = select.mock.invocationCallOrder
		const [closeOrder = 0] = close.mock.invocationCallOrder
		const [navigateOrder = 0] = navigate.mock.invocationCallOrder
		expect(selectOrder).toBeLessThan(closeOrder)
		expect(closeOrder).toBeLessThan(navigateOrder)
	})

	it('割り当ての無いキーは素通しする', () => {
		const { onKeydown, moveActive, close } = mountKeys()

		const key = press('a')
		onKeydown(key)

		expect(moveActive).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
		expect(key.defaultPrevented).toBe(false)
	})

	it('候補が無ければ Enter で閉じない', () => {
		const { onKeydown, close, activeArticle } = mountKeys()
		activeArticle.value = undefined

		onKeydown(press('Enter'))

		expect(close).not.toHaveBeenCalled()
		expect(navigate).not.toHaveBeenCalled()
	})

	// 変換中のキーは IME のもの。横取りすると変換の確定も取り消しも奪う
	it('変換中のキーは横取りしない', () => {
		const { onKeydown, moveActive, close } = mountKeys({ composing: true })

		const down = press('ArrowDown')
		onKeydown(down)
		onKeydown(press('Enter'))

		expect(moveActive).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
		expect(down.defaultPrevented).toBe(false)
	})

	// 選択が見えていない幅と、候補を出していない間
	it('選べない間はキーを横取りしない', () => {
		const { onKeydown, moveActive, close } = mountKeys({ canSelect: false })

		const down = press('ArrowDown')
		onKeydown(down)
		onKeydown(press('Enter'))

		expect(moveActive).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
		expect(down.defaultPrevented).toBe(false)
	})

	it('閉じ込めている間の Escape で閉じる', async () => {
		const { close, isTrapped } = mountKeys({}, ref(false))
		isTrapped.value = true
		await nextTick()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(close).toHaveBeenCalledTimes(1)
	})

	// SP の全画面検索は ↑↓・Enter が効かない幅で、閉じる手が Escape しか無い
	it('選べない幅でも Escape は閉じる', async () => {
		const { close, isTrapped } = mountKeys({ canSelect: false }, ref(false))
		isTrapped.value = true
		await nextTick()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(close).toHaveBeenCalledTimes(1)
	})

	it('変換中の Escape では閉じない', async () => {
		const { close, isTrapped } = mountKeys({ composing: true }, ref(false))
		isTrapped.value = true
		await nextTick()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

		expect(close).not.toHaveBeenCalled()
	})
})
