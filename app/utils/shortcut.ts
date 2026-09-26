// CapsLock では 'K' が、Windows の AltGr は Ctrl+Alt として届く
export const isSearchShortcut = (event: KeyboardEvent): boolean =>
	event.key.toLowerCase() === 'k' &&
	(event.metaKey || event.ctrlKey) &&
	!event.altKey &&
	!event.shiftKey

// iPadOS の Safari は platform に MacIntel を返す
export const usesCommandKey = (platform: string): boolean => /mac|iphone|ipad|ipod/i.test(platform)
