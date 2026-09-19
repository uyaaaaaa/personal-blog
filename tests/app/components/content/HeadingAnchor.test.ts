// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeadingAnchor from '~/components/content/HeadingAnchor.vue'

const COPY_LABEL = 'Copy link to this section'
const COPIED_LABEL = 'Link copied'

const writeText = vi.fn<(text: string) => Promise<void>>()

beforeEach(() => {
	writeText.mockReset()
	writeText.mockResolvedValue()
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

afterEach(() => {
	vi.useRealTimers()
})

const click = async () => {
	const wrapper = await mountSuspended(HeadingAnchor, { props: { headingId: 'section' } })

	await wrapper.get('button').trigger('click')
	await nextTick()

	return () => wrapper.get('button').attributes('aria-label')
}

describe('HeadingAnchor', () => {
	it('押すとその見出しの URL をクリップボードに入れる', async () => {
		await click()

		expect(writeText).toHaveBeenCalledWith(`${location.origin}${location.pathname}#section`)
	})

	it('入ったことを知らせ、しばらくすると元に戻る', async () => {
		vi.useFakeTimers()

		const label = await click()
		expect(label()).toBe(COPIED_LABEL)

		vi.runAllTimers()
		await nextTick()

		expect(label()).toBe(COPY_LABEL)
	})

	it('クリップボードに入らなければ、入ったと見せない', async () => {
		writeText.mockRejectedValue(new Error('NotAllowedError'))

		expect((await click())()).toBe(COPY_LABEL)
	})
})
