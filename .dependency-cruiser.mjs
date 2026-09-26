import { COMPONENT_AREAS } from './eslint.config.mjs'

const RULE_URL =
	'https://github.com/uyaaaaaa/personal-blog/blob/main/docs/ARCHITECTURE.md#層と依存方向'

const UI = 'ui'

// 選択肢に入る綴りを限る。| や . を含む名前は、領域でない経路まで当てる
const AREA = /^[a-z][a-z0-9-]*$/

const reject = (reason) => {
	throw new Error(`eslint.config.mjs の COMPONENT_AREAS ${reason}`)
}

if (!Array.isArray(COMPONENT_AREAS) || !COMPONENT_AREAS.every((area) => AREA.test(area))) {
	reject(`が ${AREA.source} に合う文字列の配列でない`)
}
if (!COMPONENT_AREAS.includes(UI)) {
	reject(`に ${UI} が無い`)
}

const domains = COMPONENT_AREAS.filter((area) => area !== UI)
if (domains.length === 0) {
	reject(`が ${UI} 以外の領域を挙げていない`)
}

const DOMAINS = domains.join('|')

const WITH_TEST = '^(?:tests/)?'

const upperLayers = {
	utils: `${WITH_TEST}app/(composables|components|pages|layouts)/|${WITH_TEST}app/(app|error)\\.vue$`,
	composables: `${WITH_TEST}app/(components|pages|layouts)/|${WITH_TEST}app/(app|error)\\.vue$`,
	components: `${WITH_TEST}app/(pages|layouts)/|${WITH_TEST}app/(app|error)\\.vue$`,
}

export default {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: `循環依存は禁止。型だけの依存は import type にして実行時依存を消す。${RULE_URL}`,
			from: {},
			to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
		},
		{
			name: 'utils-no-upward',
			severity: 'error',
			comment: `utils は app/ 内の何も import しない。${RULE_URL}`,
			from: { path: `${WITH_TEST}app/utils/` },
			to: { path: upperLayers.utils },
		},
		{
			name: 'composables-no-upward',
			severity: 'error',
			comment: `composables はコンポーネントとページを import しない。${RULE_URL}`,
			from: { path: `${WITH_TEST}app/composables/` },
			to: { path: upperLayers.composables },
		},
		{
			name: 'components-no-upward',
			severity: 'error',
			comment: `components はページとレイアウトを import しない。${RULE_URL}`,
			from: { path: `${WITH_TEST}app/components/` },
			to: { path: upperLayers.components },
		},
		{
			name: 'component-domains-isolated',
			severity: 'error',
			comment: `components の領域どうしは互いに import しない。共有する部品は ui へ出す。${RULE_URL}`,
			from: { path: `${WITH_TEST}app/components/(${DOMAINS})/` },
			to: {
				path: `${WITH_TEST}app/components/(${DOMAINS})/`,
				pathNot: `${WITH_TEST}app/components/$1/`,
			},
		},
		{
			name: 'ui-no-domains',
			severity: 'error',
			comment: `ui は題材を知らない。components の他を import しない。${RULE_URL}`,
			from: { path: `${WITH_TEST}app/components/${UI}/` },
			to: {
				path: `${WITH_TEST}app/components/`,
				pathNot: `${WITH_TEST}app/components/${UI}/`,
			},
		},
		{
			name: 'tests-only-from-tests',
			severity: 'error',
			comment: `tests/ を import してよいのは tests/ の中だけ。実装はテストの都合を持たない。${RULE_URL}`,
			from: { pathNot: '^tests/' },
			to: { path: '^tests/' },
		},
		{
			name: 'theme-only-from-app-vue',
			severity: 'error',
			comment: `app/ から theme/tokens.ts を直接参照するのは app.vue だけ。${RULE_URL}`,
			from: { path: `${WITH_TEST}app/`, pathNot: `${WITH_TEST}app/app\\.vue$` },
			to: { path: '^theme/' },
		},
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		exclude: { path: '^(node_modules|\\.nuxt|\\.output)/' },
		tsPreCompilationDeps: 'specify',
		tsConfig: { fileName: 'tsconfig.depcruise.json' },
		enhancedResolveOptions: {
			extensions: ['.ts', '.vue', '.mjs', '.js'],
		},
	},
}
