// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBackToClose } from '~/composables/useBackToClose'
import { withSetup } from './withSetup.test-helper'

const mounted: Array<() => void> = []

const mountBack = () => {
	const isOpen = ref(false)
	const close = vi.fn(() => {
		isOpen.value = false
	})
	const { result, unmount } = withSetup(() => useBackToClose(isOpen, close))
	mounted.push(unmount)

	return { isOpen, close, leave: result.leave }
}

// happy-dom の back() は popstate を出さないので、戻った先の state を置いて自前で出す
const popTo = (state: unknown) => {
	history.replaceState(state, '')
	window.dispatchEvent(new PopStateEvent('popstate', { state }))
}

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
	vi.restoreAllMocks()
	history.replaceState(null, '')
})

describe('useBackToClose', () => {
	it('開くと同じ URL の履歴を積み、戻る操作で閉じる', async () => {
		const push = vi.spyOn(history, 'pushState')
		const back = vi.spyOn(history, 'back').mockImplementation(() => {})
		const { isOpen, close } = mountBack()

		isOpen.value = true
		await nextTick()

		expect(push).toHaveBeenCalledOnce()
		expect(push.mock.calls[0]?.[2]).toBeUndefined()

		popTo(null)
		await nextTick()

		expect(close).toHaveBeenCalledOnce()
		expect(back).not.toHaveBeenCalled()
	})

	it('前に開いたときの印が残る履歴に戻っても閉じる', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {})
		const { isOpen, close } = mountBack()

		isOpen.value = true
		await nextTick()
		const earlier = history.state
		isOpen.value = false
		await nextTick()
		back.mockClear()

		isOpen.value = true
		await nextTick()
		popTo(earlier)
		await nextTick()

		expect(close).toHaveBeenCalledOnce()
	})

	it('戻る操作以外で閉じると、積んだ履歴を戻して消す', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {})
		const { isOpen } = mountBack()

		isOpen.value = true
		await nextTick()
		isOpen.value = false
		await nextTick()

		expect(back).toHaveBeenCalledOnce()
	})

	it.each([
		['別のページ', 0, '/tags/', '/'],
		['今のページ', 1, '/tags/', '/tags'],
	])('%sへ移ると言ってから閉じると、積んだ履歴を %i 回戻す', async (_, backs, to, from) => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {})
		const { isOpen, leave } = mountBack()

		isOpen.value = true
		await nextTick()
		leave(to, from)
		isOpen.value = false
		await nextTick()

		expect(back).toHaveBeenCalledTimes(backs)
	})

	it('閉じている間の popstate では何もしない', () => {
		const { close } = mountBack()

		popTo(null)

		expect(close).not.toHaveBeenCalled()
	})
})
