// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import HeadingAnchor from './HeadingAnchor.vue'

const click = async (init: MouseEventInit) => {
	const wrapper = await mountSuspended(HeadingAnchor, { props: { headingId: 'section' } })
	const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init })

	wrapper.get('a').element.dispatchEvent(event)

	return event
}

describe('HeadingAnchor', () => {
	it('修飾キー無しのクリックは既定の遷移を止めて自前で移動する', async () => {
		expect((await click({})).defaultPrevented).toBe(true)
	})

	it.each([['ctrlKey'], ['metaKey'], ['shiftKey']])(
		'%s 付きのクリックはブラウザに渡す',
		async (modifier) => {
			expect((await click({ [modifier]: true })).defaultPrevented).toBe(false)
		},
	)
})
