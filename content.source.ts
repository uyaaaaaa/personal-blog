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

export const emptyStore: RemoteStore = {
	list: async () => [],
	get: async () => '',
}
