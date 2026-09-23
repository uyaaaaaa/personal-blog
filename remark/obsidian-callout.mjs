// remark-mdc は [text] を span 構文として読むので、[!note] は textComponent ノードで届く

const visitBlockquotes = (node, callback) => {
	if (node.type === 'blockquote') callback(node)
	if (Array.isArray(node.children)) {
		for (const child of node.children) {
			visitBlockquotes(child, callback)
		}
	}
}

// remark-mdc が `[!note]` から生成するのは、属性なしの span ノード
const calloutTypeFromSpan = (node) => {
	if (node?.type !== 'textComponent' || node.name !== 'span') return null
	if (Object.keys(node.attributes || {}).length > 0) return null
	if (node.children?.length !== 1 || node.children[0].type !== 'text') return null

	const match = node.children[0].value.match(/^!([\w-]+)$/)
	return match ? match[1] : null
}

export default function remarkObsidianCallout() {
	return (tree) => {
		visitBlockquotes(tree, (blockquote) => {
			const paragraph = blockquote.children?.[0]
			if (paragraph?.type !== 'paragraph') return

			const type = calloutTypeFromSpan(paragraph.children?.[0])
			if (!type) return

			let fold = ''
			let title = ''
			const next = paragraph.children[1]

			if (next?.type === 'text') {
				const [firstLine, ...restLines] = next.value.split('\n')
				const match = firstLine.match(/^([+-])?[ \t]*(.*)$/)
				fold = match?.[1] || ''
				title = (match?.[2] || '').trim()

				const rest = restLines.join('\n')
				if (rest) {
					next.value = rest
					paragraph.children.splice(0, 1)
				} else {
					paragraph.children.splice(0, 2)
				}
			} else {
				paragraph.children.splice(0, 1)
			}

			if (paragraph.children.length === 0) {
				blockquote.children.shift()
			}

			blockquote.data = blockquote.data || {}
			blockquote.data.hName = 'callout'
			blockquote.data.hProperties = {
				type: type.toLowerCase(),
				...(title ? { title } : {}),
				...(fold ? { fold } : {}),
			}
		})
	}
}
