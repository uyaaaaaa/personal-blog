// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import ArticleFallback from './ArticleFallback.vue'

// queryCollection は Nuxt Content の SQLite を開く。ここで測りたいのは props に対する
// 描画なので、チェーンをそのまま返すだけのスタブに差し替えて取得先を切る
const { recent } = vi.hoisted(() => ({
	recent: vi.fn(() => [
		{ path: '/article/first', title: '最初の記事', date: '2026-01-02' },
		{ path: '/article/second', title: '次の記事', date: '2026-01-03' },
	]),
}))

mockNuxtImport('queryCollection', () => () => {
	const builder = {
		where: () => builder,
		order: () => builder,
		limit: () => builder,
		all: async () => recent(),
	}
	return builder
})

const mount = (props: Record<string, unknown>) => mountSuspended(ArticleFallback, { props })

describe('ArticleFallback', () => {
	it('error は再試行できる文言にし、進行を読み上げに載せる', async () => {
		const wrapper = await mount({ variant: 'error' })

		expect(wrapper.get('h1').text()).toBe('Unable to Load Article')
		expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('false')
		expect(wrapper.get('button').text()).toBe('Retry')
		expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
	})

	it('error で pending なら aria-busy を立ててボタンを止める', async () => {
		const wrapper = await mount({ variant: 'error', pending: true })

		expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true')
		expect(wrapper.get('button').text()).toBe('Retrying...')
		expect(wrapper.get('button').attributes('disabled')).toBeDefined()
	})

	it('Retry を押すと retry を上げる', async () => {
		const wrapper = await mount({ variant: 'error' })

		await wrapper.get('button').trigger('click')

		expect(wrapper.emitted('retry')).toHaveLength(1)
	})

	it('not-found は文言を変え、role="status" も再試行も出さない', async () => {
		const wrapper = await mount({ variant: 'not-found', path: '/article/missing' })

		expect(wrapper.get('h1').text()).toBe('Article Not Found')
		expect(wrapper.find('[role="status"]').exists()).toBe(false)
		expect(wrapper.find('[aria-busy]').exists()).toBe(false)
		expect(wrapper.find('button').exists()).toBe(false)
		expect(wrapper.text()).toContain('/article/missing')
	})

	it('回遊導線は not-found のときだけ取りに行く', async () => {
		recent.mockClear()
		const error = await mount({ variant: 'error' })
		expect(recent).not.toHaveBeenCalled()
		expect(error.text()).not.toContain('Recent Articles')

		const notFound = await mount({ variant: 'not-found', path: '/article/missing' })
		expect(recent).toHaveBeenCalled()
		expect(notFound.text()).toContain('Recent Articles')
		expect(notFound.findAll('section a').map((link) => link.attributes('href'))).toEqual([
			'/article/first',
			'/article/second',
		])
	})
})
