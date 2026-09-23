import tsParser from '@typescript-eslint/parser'
import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import { describe, it } from 'vitest'
import accessibility from '~~/eslint-rules/accessibility.mjs'

const vue = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' },
	},
})

const sfc = (template) => `<template>\n${template}\n</template>\n`

const run = (name, { valid = [], invalid = [] }) =>
	vue.run(name, accessibility.rules[name], {
		valid: valid.map((template) => ({ code: sfc(template) })),
		invalid: invalid.map((template) => ({
			code: sfc(template),
			errors: [{ messageId: 'violation' }],
		})),
	})

describe('accessible-name', () => {
	it('名前の無いボタンとリンクを落とす', () => {
		run('accessible-name', {
			invalid: [
				'<button type="button"><CloseIcon /></button>',
				'<button type="button"><close-icon /></button>',
				'<button type="button"></button>',
				'<button type="button" aria-label=""><CloseIcon /></button>',
				'<button type="button" :aria-label="open ? \'Close\' : \'\'"><CloseIcon /></button>',
				'<button type="button"><span aria-hidden="true">×</span></button>',
				'<NuxtLink to="/"><HomeIcon /></NuxtLink>',
				'<nuxt-link to="/"><HomeIcon /></nuxt-link>',
				'<RouterLink to="/"><HomeIcon /></RouterLink>',
				'<NuxtLink to="/"><LogoMarkIcon /></NuxtLink>',
				'<a href="/"><svg><path d="M0 0" /></svg></a>',
				'<a :href="href"><img src="/a.png" alt=""></a>',
				'<div role="button" tabindex="0"><MenuIcon /></div>',
				'<summary><ChevronDownIcon /></summary>',
				'<input type="button">',
				'<input type="image" src="/a.png">',
			],
		})
	})

	it('中身か属性で名前の付く操作部品を通す', () => {
		run('accessible-name', {
			valid: [
				'<button type="button">Close</button>',
				'<button type="button">{{ label }}</button>',
				'<button type="button" aria-label="Close"><CloseIcon /></button>',
				'<button type="button" :aria-label="label"><CloseIcon /></button>',
				'<button type="button" :ariaLabel="label"><CloseIcon /></button>',
				'<button type="button" v-bind:aria-label="label"><CloseIcon /></button>',
				'<button type="button" aria-labelledby="heading"><CloseIcon /></button>',
				'<button type="button" title="Close"><CloseIcon /></button>',
				'<button type="button" v-bind="attrs"><CloseIcon /></button>',
				'<button type="button" v-text="label"></button>',
				'<button type="button"><CloseIcon /><span class="sr-only">Close</span></button>',
				'<button type="button"><span><b>Close</b></span></button>',
				'<button type="button"><slot /></button>',
				'<button type="button"><UserCard /></button>',
				'<button type="button"><component :is="icon" /></button>',
				'<button type="button"><svg><title>Close</title></svg></button>',
				'<button type="button"><img src="/a.png" alt="Close"></button>',
				'<NuxtLink to="/"><HomeIcon /><span>Home</span></NuxtLink>',
				'<NuxtLink v-slot="{ href }" to="/" custom><a :href="href">Home</a></NuxtLink>',
				'<a>not a link</a>',
				'<div role="presentation"><CloseIcon /></div>',
				'<input type="button" value="Go">',
				'<input type="image" src="/a.png" alt="Go">',
				'<input type="submit">',
			],
		})
	})
})

describe('field-label', () => {
	it('ラベルの無い入力欄を落とす', () => {
		run('field-label', {
			invalid: [
				'<input type="search" placeholder="Search">',
				'<input>',
				'<textarea></textarea>',
				'<select><option>A</option></select>',
				'<label for="other">Name</label><input id="name">',
			],
		})
	})

	it('ラベルか属性で名前の付く入力欄を通す', () => {
		run('field-label', {
			valid: [
				'<input type="search" aria-label="Search">',
				'<label>Name <input></label>',
				'<label for="name">Name</label><input id="name">',
				'<label :for="id">Name</label><input id="name">',
				'<label for="name">Name</label><input :id="id">',
				'<input type="hidden" name="token">',
				'<input :type="type">',
			],
		})
	})
})

describe('no-focusable-in-hidden', () => {
	it('隠した中のフォーカスできる要素を落とす', () => {
		run('no-focusable-in-hidden', {
			invalid: [
				'<div aria-hidden="true"><button type="button">Close</button></div>',
				'<div aria-hidden="true"><p><a href="/">Home</a></p></div>',
				'<div aria-hidden="true"><NuxtLink to="/">Home</NuxtLink></div>',
				'<div aria-hidden="true"><input></div>',
				'<div aria-hidden="true"><span tabindex="0">x</span></div>',
				'<div aria-hidden="true"><div contenteditable>x</div></div>',
				'<div :aria-hidden="!open"><button type="button">Close</button></div>',
				'<div :aria-hidden="true"><button type="button">Close</button></div>',
				'<a href="/" aria-hidden="true">Home</a>',
			],
		})
	})

	it('フォーカスの届かない中身と、隠していない中身を通す', () => {
		run('no-focusable-in-hidden', {
			valid: [
				'<div aria-hidden="true"><span>■</span></div>',
				'<div aria-hidden="true" inert><button type="button">Close</button></div>',
				'<div :aria-hidden="!open" :inert="!open"><button type="button">Close</button></div>',
				'<div aria-hidden="true"><button type="button" tabindex="-1">Close</button></div>',
				'<div aria-hidden="true"><button type="button" disabled>Close</button></div>',
				'<div aria-hidden="true"><a>Home</a></div>',
				'<div aria-hidden="true"><input type="hidden"></div>',
				'<div aria-hidden="false"><button type="button">Close</button></div>',
				'<div v-bind="attrs"><button type="button">Close</button></div>',
				'<button type="button">Close</button>',
			],
		})
	})
})

describe('no-positive-tabindex', () => {
	it('正の tabindex を落とす', () => {
		run('no-positive-tabindex', {
			invalid: [
				'<div tabindex="1">x</div>',
				'<div :tabindex="2">x</div>',
				'<div :tabIndex="2">x</div>',
				'<div :tabindex="active ? 0 : 1">x</div>',
			],
		})
	})

	it('0 と負の値と、値の分からない式を通す', () => {
		run('no-positive-tabindex', {
			valid: [
				'<div tabindex="0">x</div>',
				'<main tabindex="-1">x</main>',
				'<div :tabindex="active ? 0 : -1">x</div>',
				'<div :tabindex="index">x</div>',
			],
		})
	})
})

describe('decorative-root', () => {
	const ICON = 'app/components/ui/CloseIcon.vue'
	const CARD = 'app/components/ui/UserCard.vue'
	const at = (filename, templates) =>
		templates.map((template) => ({ filename, code: sfc(template) }))

	it('ルートが隠れていない Icon と、ルートを隠した Icon 以外の名前を落とす', () => {
		vue.run('decorative-root', accessibility.rules['decorative-root'], {
			valid: [],
			invalid: [
				...at(ICON, [
					'<svg><path d="M0 0" /></svg>',
					'<UserCard />',
					'<svg /><Icon />',
				]).map((test) => ({ ...test, errors: [{ messageId: 'visible' }] })),
				...at(CARD, [
					'<svg aria-hidden="true"><path d="M0 0" /></svg>',
					'<CloseIcon />',
				]).map((test) => ({ ...test, errors: [{ messageId: 'unnamed' }] })),
			],
		})
	})

	it('名前とルートの隠し方が揃ったものを通す', () => {
		vue.run('decorative-root', accessibility.rules['decorative-root'], {
			valid: [
				...at(ICON, [
					'<svg aria-hidden="true"><path d="M0 0" /></svg>',
					'<Icon><path d="M0 0" /></Icon>',
				]),
				...at(CARD, ['<article><h2>Name</h2></article>', '<svg><title>Logo</title></svg>']),
			],
			invalid: [],
		})
	})
})
