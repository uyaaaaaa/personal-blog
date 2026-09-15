// collection は article の1つだけなので、引数は見ない。名前を変数で渡しても当たる。
// 綴りは4つあり、queryCollection 以外の3つも where を継げる（@nuxt/content の ChainablePromise）
const QUERY = /^queryCollection/
const PUBLISHED = 'published'
// 群は入れ子にできる（CollectionQueryGroup）。中の where も群を呼んだ鎖に属する。
// orWhere は群の中を OR で繋ぐので、中の published は他の条件で迂回される。数えるのは andWhere だけ
const GROUP = 'andWhere'

const methodName = (callee) =>
	callee.type === 'MemberExpression' ? (callee.property.name ?? callee.property.value) : null

const isQuery = (node) =>
	node?.type === 'CallExpression' &&
	node.callee.type === 'Identifier' &&
	QUERY.test(node.callee.name)

// 鎖の根。`a.b().c()` の receiver を下に辿ると、鎖を始めた呼び出しに着く
const root = (call) => {
	let node = call
	while (node?.type === 'CallExpression' && node.callee.type === 'MemberExpression')
		node = node.callee.object
	return node
}

// 群の関数の中から、その群を呼んだ側へ出る
const groupCall = (node) => {
	for (let it = node; it; it = it.parent) {
		if (it.type !== 'FunctionExpression' && it.type !== 'ArrowFunctionExpression') continue
		const call = it.parent
		if (call?.type !== 'CallExpression' || !call.arguments.includes(it)) return null
		return methodName(call.callee) === GROUP ? call : null
	}
	return null
}

// 公開制御が属するクエリ。鎖の根が束縛（変数・引数）なら、辿る先は無い
const queryOf = (call) => {
	const base = root(call)
	if (isQuery(base)) return base

	const group = groupCall(call)
	return group === null ? null : queryOf(group)
}

// 値として書いた 'published' と混ざらないよう、where の第1引数だけを見る
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
				if (isQuery(node)) queries.add(node)
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
