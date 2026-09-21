import { ARTICLE } from '../content.collections.mjs'

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

export default {
	rules: {
		published,
	},
}
