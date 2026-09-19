// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeadingJump } from '~/composables/useHeadingJump'

const scrollIntoView = vi.fn()
const getSelection = vi.fn<() => Selection | null>()

let target: HTMLElement

beforeEach(() => {
	scrollIntoView.mockReset()
	target = document.createElement('div')
	target.id = 'section'
	target.scrollIntoView = scrollIntoView
	document.body.append(target)

	getSelection.mockReturnValue({ isCollapsed: true } as Selection)
	window.getSelection = getSelection
})

afterEach(() => {
	target.remove()
})

// 見出しと同じ形（文字を包む要素の中にリンクが来ることがある）で呼ぶ
const mountHeading = (id: string | undefined, attrs: Record<string, unknown> = {}) => {
	let isHidden: Ref<boolean> | undefined

	const wrapper = mount(
		defineComponent({
			setup() {
				const jumper = useHeadingJump(() => id)
				isHidden = jumper.isHidden

				return () =>
					h('h2', [
						h('span', { onClick: jumper.jump }, [
							'見出しの',
							h('a', { href: '/article' }, 'リンク'),
						]),
					])
			},
		}),
		{ attrs },
	)

	return { wrapper, isHidden: isHidden as Ref<boolean> }
}

describe('useHeadingJump', () => {
	it('文字を押したら節へ移動する', async () => {
		const { wrapper } = mountHeading('section')

		await wrapper.get('span').trigger('click')

		expect(scrollIntoView).toHaveBeenCalledTimes(1)
	})

	// 見出しの中のリンクは自前の遷移を持つ。素通しすると、押した先と別の場所へ動く
	it('文字の中のリンクを押したときは動かない', async () => {
		const { wrapper } = mountHeading('section')

		await wrapper.get('a').trigger('click')

		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	it('文字を選んだ直後の押下では動かない', async () => {
		getSelection.mockReturnValue({ isCollapsed: false } as Selection)
		const { wrapper } = mountHeading('section')

		await wrapper.get('span').trigger('click')

		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	// remark-gfm が脚注に置く見出しは sr-only で、画面に出ない
	it('sr-only の見出しは、隠れている扱いにして動かさない', async () => {
		const { wrapper, isHidden } = mountHeading('section', { class: 'group sr-only' })

		await wrapper.get('span').trigger('click')

		expect(isHidden.value).toBe(true)
		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	it('id が無ければ動かない', async () => {
		const { wrapper } = mountHeading(undefined)

		await wrapper.get('span').trigger('click')

		expect(scrollIntoView).not.toHaveBeenCalled()
	})
})
