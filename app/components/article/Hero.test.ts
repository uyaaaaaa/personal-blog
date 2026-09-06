// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import Hero from './Hero.vue'

describe('Hero', () => {
	it('全体を記事へのリンクにし、キーボードから開けるようにする', async () => {
		const wrapper = await mountSuspended(Hero, {
			props: {
				article: {
					path: '/article/nuxt-content-3',
					title: 'Nuxt Content 3 に移行する',
					description: '移行の記録',
					date: '2026-01-02',
				},
			},
		})

		expect(wrapper.get('a').attributes('href')).toBe('/article/nuxt-content-3')
		expect(wrapper.get('h2').text()).toBe('Nuxt Content 3 に移行する')
	})
})
