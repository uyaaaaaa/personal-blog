// color-mode のプラグインは SSR が置く window.__NUXT_COLOR_MODE__ を読むので、テストではここで置く
if (typeof window !== 'undefined') {
	;(window as unknown as Record<string, unknown>).__NUXT_COLOR_MODE__ = {
		preference: 'light',
		value: 'light',
		getColorScheme: () => 'light',
		addColorScheme: () => {},
		removeColorScheme: () => {},
	}
}
