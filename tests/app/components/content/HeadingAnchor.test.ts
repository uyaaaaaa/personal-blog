// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HeadingAnchor from '~/components/content/HeadingAnchor.vue'
import { useToast } from '~/composables/useToast'

const writeText = vi.fn<(text: string) => Promise<void>>()
const scrollIntoView = vi.fn()
const { message, isVisible } = useToast()

let target: HTMLElement

beforeEach(() => {
	writeText.mockReset()
	writeText.mockResolvedValue()
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

	scrollIntoView.mockReset()
	target = document.createElement('div')
	target.id = 'section'
	target.scrollIntoView = scrollIntoView
	document.body.append(target)

	message.value = ''
	isVisible.value = false
})

afterEach(() => {
	target.remove()
})

const click = async (init: MouseEventInit = {}, headingId = 'section') => {
	const wrapper = await mountSuspended(HeadingAnchor, { props: { headingId } })
	const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init })

	wrapper.get('a').element.dispatchEvent(event)
	await nextTick()
	await nextTick()

	return event
}

describe('HeadingAnchor', () => {
	it('Tab で届き、何をするかを名前で伝える', async () => {
		const wrapper = await mountSuspended(HeadingAnchor, { props: { headingId: 'section' } })
		const anchor = wrapper.get('a')

		expect(anchor.attributes('aria-hidden')).toBeUndefined()
		expect(anchor.attributes('tabindex')).toBeUndefined()
		expect(anchor.attributes('aria-label')).toBe('Copy link to this section')
	})

	it('PC でもフォーカスが当たれば見せる', async () => {
		const wrapper = await mountSuspended(HeadingAnchor, { props: { headingId: 'section' } })

		expect(wrapper.get('a').classes()).toContain('lg:focus-visible:opacity-100')
	})

	it('押すと節へ移動し、その見出しの URL をクリップボードに入れる', async () => {
		expect((await click()).defaultPrevented).toBe(true)

		expect(scrollIntoView).toHaveBeenCalled()
		expect(writeText).toHaveBeenCalledWith(`${location.origin}${location.pathname}#section`)
	})

	it('非 ASCII の id は、ブラウザと同じ percent-encode された形で入れる', async () => {
		await click({}, '概要')

		expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#%E6%A6%82%E8%A6%81'))
	})

	it('入ったことを知らせる', async () => {
		await click()

		expect(message.value).toBe('Link copied')
		expect(isVisible.value).toBe(true)
	})

	it('クリップボードに入らなければ、入ったと知らせない', async () => {
		writeText.mockRejectedValue(new Error('NotAllowedError'))

		await click()

		expect(isVisible.value).toBe(false)
	})

	it.each([['ctrlKey'], ['metaKey'], ['shiftKey']])(
		'%s 付きのクリックはブラウザに渡す',
		async (modifier) => {
			expect((await click({ [modifier]: true })).defaultPrevented).toBe(false)
			expect(writeText).not.toHaveBeenCalled()
		},
	)
})
