// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import Hero from '~/components/article/Hero.vue'

const mount = (props: Record<string, unknown> = {}) =>
	mountSuspended(Hero, {
		props: {
			article: {
				path: '/article/nuxt-content-3',
				title: 'Nuxt Content 3 に移行する',
				description: '移行の記録',
				date: '2026-01-02',
				...props,
			},
		},
	})

describe('Hero', () => {
	it('ページの見出しは記事のタイトルで、記事へのリンクにする', async () => {
		const wrapper = await mount()

		expect(wrapper.get('h1').text()).toBe('Nuxt Content 3 に移行する')
		expect(wrapper.get('h1 a').attributes('href')).toBe('/article/nuxt-content-3')
	})

	it('date は datetime に生値、本文にドット区切りで出す', async () => {
		const wrapper = await mount()

		expect(wrapper.get('time').attributes('datetime')).toBe('2026-01-02')
		expect(wrapper.get('time').text()).toBe('2026.01.02')
	})

	it('tags は渡した順に出し、無ければ1つも出さない', async () => {
		const tagged = await mount({ tags: ['Nuxt', 'Vue'] })
		expect(tagged.findAll('.tag').map((tag) => tag.text())).toEqual(['#Nuxt', '#Vue'])

		expect((await mount()).findAll('.tag')).toHaveLength(0)
	})
})
