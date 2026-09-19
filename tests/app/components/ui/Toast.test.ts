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
	// v-if で消すと、出す側が触れる要素が SSR の HTML に無くなる
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
})
