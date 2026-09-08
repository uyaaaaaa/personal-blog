// Cmd（mac）と Ctrl（Windows）は同じキーの呼び名違い。大文字も見るのは CapsLock で
// 'K' が届くため、Alt を外すのは Windows の AltGr が Ctrl+Alt として届くため
export const isSearchShortcut = (event: KeyboardEvent): boolean =>
	event.key.toLowerCase() === 'k' &&
	(event.metaKey || event.ctrlKey) &&
	!event.altKey &&
	!event.shiftKey
