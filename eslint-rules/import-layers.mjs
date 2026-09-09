import path from 'node:path'

const ARCHITECTURE_URL =
	'https://github.com/uyaaaaaa/personal-blog/blob/main/docs/ARCHITECTURE.md#層と依存方向'

// 並びは依存の向きと同じ順に置く。pages/ と layouts/ の .vue も import される側はコンポーネント
const LAYERS = [
	{ name: 'コンポーネント', directories: ['app/components/', 'app/pages/', 'app/layouts/'] },
	{ name: 'composable', directories: ['app/composables/'] },
	{ name: 'util', directories: ['app/utils/'] },
]

// `~/` は app/、`~~/` はリポジトリの直下を指す。外部パッケージは並びを見ないので null
function targetOf(specifier, filename, cwd) {
	if (specifier.startsWith('~/')) return `app/${specifier.slice(2)}`
	if (specifier.startsWith('~~/')) return specifier.slice(3)
	if (!specifier.startsWith('.')) return null
	const from = path.dirname(path.resolve(cwd, filename))
	return path.relative(cwd, path.resolve(from, specifier))
}

function layerOf(target) {
	if (target === null) return null
	const index = LAYERS.findIndex(({ directories }) =>
		directories.some((directory) => target.startsWith(directory)),
	)
	return index === -1 ? null : index
}

const order = {
	meta: {
		type: 'problem',
		schema: [],
		messages: {
			order: `import の並びはコンポーネント → composable → util。「{{layer}}」の import は、上にある「{{above}}」の import より前に置く。 ${ARCHITECTURE_URL}`,
		},
	},
	create(context) {
		return {
			Program(program) {
				let deepest = null
				for (const node of program.body) {
					if (node.type !== 'ImportDeclaration') continue
					const layer = layerOf(
						targetOf(node.source.value, context.filename, context.cwd),
					)
					if (layer === null) continue
					if (deepest !== null && layer < deepest) {
						context.report({
							node,
							messageId: 'order',
							data: { layer: LAYERS[layer].name, above: LAYERS[deepest].name },
						})
						continue
					}
					deepest = layer
				}
			},
		}
	},
}

export default {
	rules: {
		order,
	},
}
