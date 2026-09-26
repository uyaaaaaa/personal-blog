import { defineCollectionSource } from '@nuxt/content'
import { readFrontMatter } from './content.frontmatter'
import { digestSchema } from './content.schema'

export type RemoteStore = {
	list: () => Promise<string[]>
	get: (key: string) => Promise<string>
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

const validated = (key: string, body: string) => {
	let data
	try {
		data = readFrontMatter(body)
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

const MANIFEST = '_manifest.json'
const ITEM = /\.md$/

const runOf = (key: string) => key.slice(0, key.lastIndexOf('/') + 1)

const isManifest = (body: string) => {
	const data: unknown = JSON.parse(body)
	return typeof data === 'object' && data !== null && !Array.isArray(data)
}

const completed = async (store: RemoteStore, run: string) => {
	try {
		if (isManifest(await store.get(`${run}${MANIFEST}`))) return true
		console.warn(`${run}${MANIFEST}: マニフェストが壊れているので、この回を公開しない`)
	} catch (error) {
		console.warn(
			`${run}${MANIFEST}: マニフェストを読めないので、この回を公開しない（${reason(error)}）`,
		)
	}
	return false
}

const completedItems = async (store: RemoteStore) => {
	const keys = await store.list()
	const runs = keys.filter((key) => key.endsWith(`/${MANIFEST}`)).map(runOf)
	const verdicts = await Promise.all(runs.map((run) => completed(store, run)))
	const done = new Set(runs.filter((_, index) => verdicts[index]))
	return keys.filter((key) => ITEM.test(key) && done.has(runOf(key)))
}

export const remoteCollection = (store: RemoteStore) =>
	defineCollectionSource({
		getKeys: async () => {
			try {
				return await completedItems(store)
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
