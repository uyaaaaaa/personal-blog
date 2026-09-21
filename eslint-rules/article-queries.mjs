import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARTICLE } from '../content.collections.mjs'

const INVARIANT_URL =
	'https://github.com/uyaaaaaa/personal-blog/blob/main/docs/ARCHITECTURE.md#不変条件'

// 起点は eslint を打つ場所に依らせない。cwd から見ると、リポジトリ直下以外から打ったとき
// 置き場そのものが置き場の外に見え、クエリの本体が落ちる
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const QUERY_DIRECTORY = path.join(ROOT, 'app', 'utils') + path.sep

// collection を引く綴りは4つあり、queryCollection 以外の3つも where を継げる（@nuxt/content）
const QUERY = /^queryCollection/
const PUBLISHED = 'published'
// orWhere は群の中を OR で繋ぐので、中の published は隣の条件で迂回される（@nuxt/content）
const GROUP = 'andWhere'

const ASSERTION = new Set([
	'TSNonNullExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
])

const bare = (node) => {
	let it = node
	while (it && ASSERTION.has(it.type)) it = it.expression
	return it
}

const methodName = (callee) =>
	callee.type === 'MemberExpression' ? (callee.property.name ?? callee.property.value) : null

const mayQueryArticles = (node) => {
	const [collection] = node.arguments
	return collection?.type !== 'Literal' || collection.value === ARTICLE
}

const isQuery = (node) =>
	node?.type === 'CallExpression' &&
	node.callee.type === 'Identifier' &&
	QUERY.test(node.callee.name)

const root = (call) => {
	let node = call
	while (node?.type === 'CallExpression' && node.callee.type === 'MemberExpression')
		node = bare(node.callee.object)
	return node
}

const holder = (node) => {
	let it = node.parent
	while (it && ASSERTION.has(it.type)) it = it.parent
	return it
}

const groupCall = (node) => {
	for (let it = node; it; it = it.parent) {
		if (it.type !== 'FunctionExpression' && it.type !== 'ArrowFunctionExpression') continue

		const call = holder(it)
		if (call?.type !== 'CallExpression') return null
		if (!call.arguments.some((argument) => bare(argument) === it)) return null

		return methodName(call.callee) === GROUP ? call : null
	}
	return null
}

const queryOf = (call) => {
	const base = root(call)
	if (isQuery(base)) return base

	const group = groupCall(call)
	return group === null ? null : queryOf(group)
}

const filtersPublished = (call) =>
	methodName(call.callee) === 'where' && call.arguments[0]?.value === PUBLISHED

const published = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			published:
				"記事のクエリには公開制御（.where('published', ...)）を同じ鎖に続けて書く。抜けると下書きが本番に出る。",
		},
	},
	create(context) {
		const queries = new Set()
		const filtered = new Set()

		return {
			CallExpression(node) {
				if (isQuery(node) && mayQueryArticles(node)) queries.add(node)
				if (!filtersPublished(node)) return

				const query = queryOf(node)
				if (query !== null) filtered.add(query)
			},
			'Program:exit'() {
				for (const query of queries)
					if (!filtered.has(query))
						context.report({ node: query, messageId: 'published' })
			},
		}
	},
}

const location = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			location: `記事の取得を組み立てるのは app/utils/ だけ。ここでは utils/ のクエリを import し、条件を継いで使う。 ${INVARIANT_URL}`,
		},
	},
	create(context) {
		if (path.resolve(context.filename).startsWith(QUERY_DIRECTORY)) return {}

		return {
			CallExpression(node) {
				if (isQuery(node) && mayQueryArticles(node))
					context.report({ node, messageId: 'location' })
			},
		}
	},
}

export default {
	rules: {
		location,
		published,
	},
}
