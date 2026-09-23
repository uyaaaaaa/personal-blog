const ADR_URL =
	'https://github.com/uyaaaaaa/personal-blog/blob/main/docs/adr/01-page-number-in-path.md'

const RENDER_ONLY = 'ルートファイルは実体コンポーネントを import して描画するだけにする。'

// Nuxt のスキャン除外規則。ルートファイルが描画する実体は `-` 始まりの名前で置く
const ENTITY_MODULE = /(?:^|\/)-[^/]+\.vue$/

// テンプレートの名前は PascalCase でも kebab-case でも同じ実体を指す
const asName = (name) => name.toLowerCase().replaceAll('-', '')

// Vue がコンポーネントとして解決する綴り（大文字始まりかハイフン入り）だけを数える
const componentName = (rawName) =>
	/^[A-Z]/.test(rawName) || rawName.includes('-') ? asName(rawName) : null

const isBlank = (node) => node.type === 'VText' && node.value.trim() === ''

const isEntityModule = (source) =>
	source.type === 'Literal' &&
	typeof source.value === 'string' &&
	ENTITY_MODULE.test(source.value)

// import() は defineAsyncComponent 等を挟むので、名前は宣言まで遡って拾う
const declaredName = (node) => {
	for (let it = node; it; it = it.parent)
		if (it.type === 'VariableDeclarator') return it.id.type === 'Identifier' ? it.id.name : null
	return null
}

const renderOnly = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			logic: `${RENDER_ONLY}ロジックは実体の側に置く。 ${ADR_URL}`,
			markup: `${RENDER_ONLY}マークアップは実体の側に置く。 ${ADR_URL}`,
			block: `${RENDER_ONLY}<{{block}}> は実体の側に置く。 ${ADR_URL}`,
		},
	},
	create(context) {
		const services = context.sourceCode.parserServices ?? context.parserServices
		const entities = new Set()
		let isRootFile = false

		const reportBlocks = () => {
			const document = services?.getDocumentFragment?.()
			for (const child of document?.children ?? []) {
				if (child.type !== 'VElement') continue
				if (child.name === 'template' || child.name === 'script') continue
				context.report({
					loc: child.loc,
					messageId: 'block',
					data: { block: child.rawName },
				})
			}
		}

		const reportTemplate = (template) => {
			let rendered = false
			for (const child of template.children) {
				if (isBlank(child)) continue
				if (
					child.type !== 'VElement' ||
					rendered ||
					!entities.has(componentName(child.rawName))
				) {
					context.report({ loc: child.loc, messageId: 'markup' })
					continue
				}
				rendered = true
				for (const attribute of child.startTag.attributes)
					context.report({
						loc: attribute.loc,
						messageId: attribute.directive ? 'logic' : 'markup',
					})
				for (const grandchild of child.children)
					if (!isBlank(grandchild))
						context.report({ loc: grandchild.loc, messageId: 'markup' })
			}
		}

		return {
			ImportExpression(node) {
				if (!isEntityModule(node.source)) return
				isRootFile = true
				const name = declaredName(node)
				if (name !== null) entities.add(asName(name))
			},
			'Program:exit'(program) {
				for (const node of program.body) {
					if (node.type !== 'ImportDeclaration' || !isEntityModule(node.source)) continue
					isRootFile = true
					for (const { local } of node.specifiers) entities.add(asName(local.name))
				}
				if (!isRootFile) return

				for (const node of program.body)
					if (node.type !== 'ImportDeclaration')
						context.report({ node, messageId: 'logic' })

				if (program.templateBody) reportTemplate(program.templateBody)
				reportBlocks()
			},
		}
	},
}

export default {
	rules: {
		'render-only': renderOnly,
	},
}
