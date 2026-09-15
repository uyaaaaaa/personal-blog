// collection は article の1つだけなので、引数は見ない。名前を変数で渡しても当たる。
// 綴りは4つあり、queryCollection 以外の3つも where を継げる（@nuxt/content の ChainablePromise）
const QUERY = /^queryCollection/
const PUBLISHED = 'published'

const methodName = (callee) =>
	callee.type === 'MemberExpression' ? (callee.property.name ?? callee.property.value) : null

// 鎖の続きを上に辿る。`.where()` は object から MemberExpression を経て CallExpression に上がる
const chain = (query) => {
	const links = []
	for (let node = query; ;) {
		const member = node.parent
		if (member?.type !== 'MemberExpression' || member.object !== node) return links
		const call = member.parent
		if (call?.type !== 'CallExpression' || call.callee !== member) return links
		links.push(call)
		node = call
	}
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
		return {
			CallExpression(node) {
				if (node.callee.type !== 'Identifier' || !QUERY.test(node.callee.name)) return
				if (chain(node).some(filtersPublished)) return

				context.report({ node, messageId: 'published' })
			},
		}
	},
}

export default {
	rules: {
		published,
	},
}
