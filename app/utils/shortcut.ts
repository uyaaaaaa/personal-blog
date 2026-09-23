// CapsLock では 'K' が、Windows の AltGr は Ctrl+Alt として届く
export const isSearchShortcut = (event: KeyboardEvent): boolean =>
	event.key.toLowerCase() === 'k' &&
	(event.metaKey || event.ctrlKey) &&
	!event.altKey &&
	!event.shiftKey
