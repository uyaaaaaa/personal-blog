// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import {
	TOC_COLLAPSED_ATTRIBUTE,
	TOC_COLLAPSED_KEY,
	followStoredTocCollapseScript,
} from '~/utils/tocCollapse'

const run = () => new Function(followStoredTocCollapseScript)()

const collapsed = () => document.documentElement.hasAttribute(TOC_COLLAPSED_ATTRIBUTE)

afterEach(() => {
	localStorage.clear()
	document.documentElement.removeAttribute(TOC_COLLAPSED_ATTRIBUTE)
})

describe('followStoredTocCollapseScript', () => {
	it('保存された畳みを描画前に html へ写す', () => {
		localStorage.setItem(TOC_COLLAPSED_KEY, 'true')

		run()

		expect(collapsed()).toBe(true)
	})

	it('保存が無ければ開いたまま', () => {
		run()

		expect(collapsed()).toBe(false)
	})

	it('別のタブの変更に合わせる', () => {
		run()

		window.dispatchEvent(
			new StorageEvent('storage', { key: TOC_COLLAPSED_KEY, newValue: 'true' }),
		)
		expect(collapsed()).toBe(true)

		window.dispatchEvent(
			new StorageEvent('storage', { key: TOC_COLLAPSED_KEY, newValue: null }),
		)
		expect(collapsed()).toBe(false)
	})
})
