const RULE_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/docs/ARCHITECTURE.md#依存方向'

const upperLayers = {
	utils: '^app/(composables|components|pages|layouts)/|^app/(app|error)\\.vue$',
	composables: '^app/(components|pages|layouts)/|^app/(app|error)\\.vue$',
	components: '^app/(pages|layouts)/|^app/(app|error)\\.vue$',
}

module.exports = {
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
			from: { path: '^app/utils/' },
			to: { path: upperLayers.utils },
		},
		{
			name: 'composables-no-upward',
			severity: 'error',
			comment: `composables はコンポーネントとページを import しない。${RULE_URL}`,
			from: { path: '^app/composables/' },
			to: { path: upperLayers.composables },
		},
		{
			name: 'components-no-upward',
			severity: 'error',
			comment: `components はページとレイアウトを import しない。${RULE_URL}`,
			from: { path: '^app/components/' },
			to: { path: upperLayers.components },
		},
		{
			name: 'theme-only-from-app-vue',
			severity: 'error',
			comment: `theme/tokens.ts を直接参照するのは app.vue だけ。${RULE_URL}`,
			from: { pathNot: '^app/app\\.vue$' },
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
