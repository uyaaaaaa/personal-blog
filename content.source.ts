import { defineCollectionSource } from '@nuxt/content'
import { parseFrontMatter } from 'remark-mdc'
import { digestSchema } from './content.schema'

export type RemoteStore = {
	list: () => Promise<string[]>
	get: (key: string) => Promise<string>
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

const validated = (key: string, body: string) => {
	let data
	// parseFrontMatter は大抵の壊れ方を値に復元して返すが、解決できない alias では投げる
	try {
		;({ data } = parseFrontMatter(body))
	} catch (error) {
		throw new Error(`${key}: フロントマターを読み取れない（${reason(error)}）`)
	}

	const result = digestSchema.safeParse(data)
	if (result.success) return body

	const issues = result.error.issues.map((issue) => {
		const where = issue.path.join('.')
		return `${where === '' ? '' : `${where}: `}${issue.message}`
	})
	throw new Error(`${key}: フロントマターがスキーマに合わない（${issues.join(' / ')}）`)
}

// @nuxt/content は getItem の失敗だけを warn で読み飛ばし、getKeys の失敗はビルドごと落とす。
// 1件の破損と収集の全滅を同じ扱いにしないため、握る場所をこの2つで分ける
export const remoteCollection = (store: RemoteStore) =>
	defineCollectionSource({
		getKeys: async () => {
			try {
				return await store.list()
			} catch (error) {
				console.warn(`収集したものを読めないので空の collection にする: ${reason(error)}`)
				return []
			}
		},
		getItem: async (key: string) => validated(key, await store.get(key)),
	})

// 読む先は #312 が差し替える。それまで digest は空で組み上がる
export const emptyStore: RemoteStore = {
	list: async () => [],
	get: async () => '',
}
