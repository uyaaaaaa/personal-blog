// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCloseWhenHidden } from '~/composables/useCloseWhenHidden'
import { withSetup } from './withSetup.test-helper'

const mounted: Array<() => void> = []

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
})

describe('useCloseWhenHidden', () => {
	it('開いている要素が CSS で隠れたら閉じる', async () => {
		let shown = true
		const host = ref<HTMLElement | null>(document.createElement('div'))
		Object.defineProperty(host.value, 'getClientRects', {
			value: () => (shown ? [{}] : []),
		})
		const isOpen = ref(true)
		const close = vi.fn(() => {
			isOpen.value = false
		})
		const { unmount } = withSetup(() => useCloseWhenHidden(isOpen, host, close))
		mounted.push(unmount)

		expect(close).not.toHaveBeenCalled()

		shown = false
		window.dispatchEvent(new Event('resize'))
		await new Promise((done) => requestAnimationFrame(() => done(undefined)))

		expect(close).toHaveBeenCalledOnce()
	})

	it('閉じている間は表示状態を読まない', () => {
		const getClientRects = vi.fn(() => [])
		const host = ref<HTMLElement | null>(document.createElement('div'))
		Object.defineProperty(host.value, 'getClientRects', { value: getClientRects })
		const { unmount } = withSetup(() => useCloseWhenHidden(ref(false), host, vi.fn()))
		mounted.push(unmount)

		expect(getClientRects).not.toHaveBeenCalled()
	})
})
