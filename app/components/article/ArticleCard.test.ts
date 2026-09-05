// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ArticleCard from './ArticleCard.vue'

const mount = (props: Record<string, unknown>) =>
	mountSuspended(ArticleCard, {
		props: { title: 'Nuxt Content 3 に移行する', path: '/article/nuxt-content-3', ...props },
	})

describe('ArticleCard', () => {
	it('カード全体を記事へのリンクにする', async () => {
		const wrapper = await mount({})

		expect(wrapper.get('a').attributes('href')).toBe('/article/nuxt-content-3')
		expect(wrapper.get('h3').text()).toBe('Nuxt Content 3 に移行する')
	})

	it('emoji が無ければ 📝 を出す', async () => {
		expect((await mount({})).text()).toContain('📝')
		expect((await mount({ emoji: '🚀' })).text()).toContain('🚀')
	})

	it('date は datetime に生値、本文にドット区切りで出す', async () => {
		const wrapper = await mount({ date: '2026-01-02' })

		expect(wrapper.get('time').attributes('datetime')).toBe('2026-01-02')
		expect(wrapper.get('time').text()).toBe('2026.01.02')
	})

	it('date が無ければ time の中身を空にする', async () => {
		const wrapper = await mount({})

		expect(wrapper.get('time').text()).toBe('')
	})

	it('tags は渡した順に出し、無ければ1つも出さない', async () => {
		const tagged = await mount({ tags: ['Nuxt', 'Vue'] })
		expect(tagged.findAll('.tag').map((tag) => tag.text())).toEqual(['Nuxt', 'Vue'])

		expect((await mount({})).findAll('.tag')).toHaveLength(0)
	})
})
