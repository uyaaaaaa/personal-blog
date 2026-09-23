// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import Toast from '~/components/ui/Toast.vue'
import { useToast } from '~/composables/useToast'

const { message, isVisible, show } = useToast()

afterEach(() => {
	isVisible.value = false
	message.value = ''
})

describe('Toast', () => {
	it('出していない間も要素は残し、見えなくするだけにする', async () => {
		const wrapper = await mountSuspended(Toast)

		expect(wrapper.get('[role="status"]').classes()).toContain('invisible')
	})

	it('出した文面を見せる', async () => {
		const wrapper = await mountSuspended(Toast)

		show('Link copied')
		await nextTick()

		expect(wrapper.get('[role="status"]').text()).toBe('Link copied')
		expect(wrapper.get('[role="status"]').classes()).not.toContain('invisible')
	})

	it('同じ文面を出し直すたびに、読み上げられるよう文面を差し替える', async () => {
		const wrapper = await mountSuspended(Toast)

		show('Link copied')
		await nextTick()
		const first = wrapper.get('[role="status"] span').element

		show('Link copied')
		await nextTick()

		expect(wrapper.get('[role="status"] span').element).not.toBe(first)
		expect(wrapper.get('[role="status"]').text()).toBe('Link copied')
	})

	it('PC でも出す', async () => {
		const wrapper = await mountSuspended(Toast)

		expect(wrapper.get('[role="status"]').classes()).not.toContain('lg:hidden')
	})

	it('ヘッダー直下で目次の前面にリンクアイコンとともに置く', async () => {
		const wrapper = await mountSuspended(Toast)
		const toast = wrapper.get('[role="status"]')

		expect(toast.classes()).toContain('top-below-header-sm')
		expect(toast.classes()).toContain('md:top-below-header')
		expect(toast.classes()).toContain('z-50')
		expect(toast.find('svg').exists()).toBe(true)
		expect(toast.find('path').attributes('d')).toBe(
			'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
		)
	})
})
