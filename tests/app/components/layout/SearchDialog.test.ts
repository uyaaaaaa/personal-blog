// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import SearchDialog from '~/components/layout/SearchDialog.vue'

// queryCollection は Nuxt Content の SQLite を開く。記事を 2 本返すスタブで取得先を切る
mockNuxtImport('queryCollection', () => () => {
	const builder = {
		where: () => builder,
		order: () => builder,
		select: () => builder,
		all: async () => [
			{ path: '/article/vim-abbreviation', title: 'vim abbreviation', date: '2026-01-17' },
			{ path: '/article/vim-macro', title: 'vim macro', date: '2026-01-18' },
		],
	}
	return builder
})

describe('SearchDialog', () => {
	// フレームを跨ぐと、モバイルブラウザが仮想キーボードを自動表示する判定から外れる
	it('開いた直後、フレームを待たずに入力欄へフォーカスする', async () => {
		const wrapper = await mountSuspended(SearchDialog, {
			props: { isOpen: false },
			attachTo: document.body,
		})

		await wrapper.setProps({ isOpen: true })

		expect(document.activeElement).toBe(wrapper.get('input').element)
	})

	it('候補が出たら件数を読み上げる状態に出す', async () => {
		const wrapper = await mountSuspended(SearchDialog, { props: { isOpen: true } })

		await wrapper.get('input').setValue('vim')

		expect(wrapper.get('[role="status"]').text()).toBe('2 articles found.')
	})
})
