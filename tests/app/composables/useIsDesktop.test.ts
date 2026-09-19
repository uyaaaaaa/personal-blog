// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withSetup } from './withSetup.test-helper'

// Toc・TocInline・ScrollToTopButton の lg: と同じ幅
const DESKTOP_QUERY = '(min-width: 1024px)'

type ChangeListener = (event: { matches: boolean }) => void

const listeners = new Set<ChangeListener>()
let matchMedia: ReturnType<typeof vi.fn>
let useIsDesktop: typeof import('~/composables/useIsDesktop').useIsDesktop

const mounted: Array<() => void> = []

const mountIsDesktop = () => {
	const { result, unmount } = withSetup(() => useIsDesktop())
	mounted.push(unmount)
	return result
}

const changeTo = (matches: boolean) => {
	for (const listener of listeners) listener({ matches })
}

// query をモジュールに1つだけ持ち、一度作ったら作り直さない実装なので、
// 購読の本数を測るテストごとにモジュールごと入れ直す
const load = async (matches: boolean) => {
	listeners.clear()

	matchMedia = vi.fn((media: string) => ({
		media,
		matches,
		addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
		removeEventListener: (_type: string, listener: ChangeListener) =>
			listeners.delete(listener),
	}))
	vi.stubGlobal('matchMedia', matchMedia)
	Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true })

	vi.resetModules()
	;({ useIsDesktop } = await import('~/composables/useIsDesktop'))
}

beforeEach(async () => {
	await load(false)
})

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount()
	vi.unstubAllGlobals()
})

describe('useIsDesktop', () => {
	it('lg と同じ幅を問い合わせ、その時点の一致を初期値にする', async () => {
		await load(true)
		const { isDesktop, isMobile } = mountIsDesktop()

		expect(matchMedia).toHaveBeenCalledWith(DESKTOP_QUERY)
		expect(isDesktop.value).toBe(true)
		expect(isMobile.value).toBe(false)
	})

	it('一致していなければモバイル扱いで始める', () => {
		const { isDesktop, isMobile } = mountIsDesktop()

		expect(isDesktop.value).toBe(false)
		expect(isMobile.value).toBe(true)
	})

	it('何箇所から呼ばれても問い合わせと購読はモジュールで1本', () => {
		mountIsDesktop()
		mountIsDesktop()
		mountIsDesktop()

		expect(matchMedia).toHaveBeenCalledTimes(1)
		expect(listeners.size).toBe(1)
	})

	it('change で反転し、呼び出し側すべてに同じ値が届く', () => {
		const first = mountIsDesktop()
		const second = mountIsDesktop()

		changeTo(true)

		expect(first.isDesktop.value).toBe(true)
		expect(second.isDesktop.value).toBe(true)
		expect(first.isMobile.value).toBe(false)

		changeTo(false)

		expect(first.isDesktop.value).toBe(false)
		expect(second.isMobile.value).toBe(true)
	})
})
