// color-mode のクライアントプラグインは、SSR が置く window.__NUXT_COLOR_MODE__ から初期値を
// 読む。テスト環境では SSR が走らず、プラグインが持つ代替値も import.meta.test が立たないため
// 使われないので、同じ形の値をここで置く。node 環境のテストには window ごと無い
if (typeof window !== 'undefined') {
	;(window as unknown as Record<string, unknown>).__NUXT_COLOR_MODE__ = {
		preference: 'light',
		value: 'light',
		getColorScheme: () => 'light',
		addColorScheme: () => {},
		removeColorScheme: () => {},
	}
}
