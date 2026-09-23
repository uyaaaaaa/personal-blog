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

	it('SP では画面上部にリンクアイコンとともに置く', async () => {
		const wrapper = await mountSuspended(Toast)
		const toast = wrapper.get('[role="status"]')

		expect(toast.classes()).toContain('top-6')
		expect(toast.classes()).toContain('lg:hidden')
		expect(toast.find('svg').exists()).toBe(true)
		expect(toast.find('path').attributes('d')).toBe(
			'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
		)
	})
})
