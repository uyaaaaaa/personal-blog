import { describe, expect, it } from 'vitest'
import { isSearchShortcut, usesCommandKey } from '~/utils/shortcut'

const keydown = (key: string, modifiers: Partial<KeyboardEventInit> = {}) =>
	({
		key,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		...modifiers,
	}) as KeyboardEvent

describe('isSearchShortcut', () => {
	it('mac の Cmd+K を受ける', () => {
		expect(isSearchShortcut(keydown('k', { metaKey: true }))).toBe(true)
	})

	it('Windows の Ctrl+K を受ける', () => {
		expect(isSearchShortcut(keydown('k', { ctrlKey: true }))).toBe(true)
	})

	it('CapsLock で大文字が届いても受ける', () => {
		expect(isSearchShortcut(keydown('K', { metaKey: true }))).toBe(true)
	})

	it('修飾キーの無い K は受けない', () => {
		expect(isSearchShortcut(keydown('k'))).toBe(false)
	})

	it('Shift を足したものは受けない', () => {
		expect(isSearchShortcut(keydown('K', { metaKey: true, shiftKey: true }))).toBe(false)
	})

	it('Alt を足したものは受けない', () => {
		expect(isSearchShortcut(keydown('k', { ctrlKey: true, altKey: true }))).toBe(false)
	})

	it('K 以外のキーは受けない', () => {
		expect(isSearchShortcut(keydown('j', { metaKey: true }))).toBe(false)
		expect(isSearchShortcut(keydown('Enter', { metaKey: true }))).toBe(false)
	})
})

describe('usesCommandKey', () => {
	it('macOS と iPadOS・iOS では ⌘ を使う', () => {
		expect(usesCommandKey('MacIntel')).toBe(true)
		expect(usesCommandKey('iPad')).toBe(true)
		expect(usesCommandKey('iPhone')).toBe(true)
	})

	it('Windows と Linux では Ctrl を使う', () => {
		expect(usesCommandKey('Win32')).toBe(false)
		expect(usesCommandKey('Linux x86_64')).toBe(false)
	})
})
