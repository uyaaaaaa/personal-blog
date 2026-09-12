// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ArticleRow from '~/components/article/ArticleRow.vue'

const mount = (props: Record<string, unknown>) =>
	mountSuspended(ArticleRow, {
		props: {
			number: 1,
			title: 'Nuxt Content 3 に移行する',
			path: '/article/nuxt-content-3',
			...props,
		},
	})

describe('ArticleRow', () => {
	it('行全体を記事へのリンクにする', async () => {
		const wrapper = await mount({})

		expect(wrapper.get('a').attributes('href')).toBe('/article/nuxt-content-3')
		expect(wrapper.get('h2').text()).toBe('Nuxt Content 3 に移行する')
	})

	it('連番は2桁までゼロ埋めし、それを超えたら桁を落とさない', async () => {
		expect((await mount({ number: 1 })).text()).toContain('01')
		expect((await mount({ number: 10 })).text()).toContain('10')
		expect((await mount({ number: 100 })).text()).toContain('100')
	})

	it('date は datetime に生値、本文にドット区切りで出す', async () => {
		const wrapper = await mount({ date: '2026-01-02' })

		expect(wrapper.get('time').attributes('datetime')).toBe('2026-01-02')
		expect(wrapper.get('time').text()).toBe('2026.01.02')
	})

	it('date が無ければ time の中身を空にする', async () => {
		expect((await mount({})).get('time').text()).toBe('')
	})

	it('tags は # を付けて渡した順に出し、無ければ1つも出さない', async () => {
		const tagged = await mount({ tags: ['Nuxt', 'Vue'] })
		expect(tagged.findAll('.tag').map((tag) => tag.text())).toEqual(['#Nuxt', '#Vue'])

		expect((await mount({})).findAll('.tag')).toHaveLength(0)
	})
})
