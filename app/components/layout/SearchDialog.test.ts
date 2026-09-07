// @vitest-environment nuxt
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import SearchDialog from './SearchDialog.vue'

// queryCollection は Nuxt Content の SQLite を開く。ここで測りたいのは開いた直後の
// フォーカスなので、空の結果を返すだけのスタブに差し替えて取得先を切る
mockNuxtImport('queryCollection', () => () => {
	const builder = {
		where: () => builder,
		order: () => builder,
		select: () => builder,
		all: async () => [],
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
})
