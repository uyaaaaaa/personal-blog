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

const click = async (init: MouseEventInit = {}) => {
	const wrapper = await mountSuspended(HeadingAnchor, { props: { headingId: 'section' } })
	const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init })

	wrapper.get('a').element.dispatchEvent(event)
	await nextTick()
	await nextTick()

	return event
}

describe('HeadingAnchor', () => {
	it('押すと節へ移動し、その見出しの URL をクリップボードに入れる', async () => {
		expect((await click()).defaultPrevented).toBe(true)

		expect(scrollIntoView).toHaveBeenCalled()
		expect(writeText).toHaveBeenCalledWith(`${location.origin}${location.pathname}#section`)
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
