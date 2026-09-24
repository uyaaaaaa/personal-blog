import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROMIUM_CANDIDATES = [
	process.env.CHROMIUM_PATH,
	'/opt/pw-browsers/chromium',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/usr/bin/google-chrome',
]

const DEBUG_PORT = 9333
const TRANSPARENT = 'rgba(0, 0, 0, 0)'
const NO_ACTIVE = 'なし'
const NO_RING = 'なし'
const OPEN_TIMEOUT = 4000
const TRANSITION = 400

export const OVERLAYS = {
	search: {
		trigger: 'header button[aria-haspopup="dialog"]',
		shortcut: 'K',
		covering: 'drawer',
		overlay: '.search-overlay',
		trap: '.search-dialog',
		input: '.search-dialog .search-input',
		field: '.search-dialog .search-field',
		link: '.search-dialog .search-result',
		scroller: '.search-dialog .search-results',
		dialog: true,
		restoresOnOutsideClick: true,
		widths: [375, 1280],
	},
	drawer: {
		trigger: '.mobile-menu-btn',
		overlay: '.mobile-menu-overlay',
		trap: '.mobile-drawer',
		input: null,
		expand: 'button[aria-controls="drawer-group-latest"]',
		link: '#drawer-group-latest a',
		scroller: '.mobile-drawer',
		dialog: true,
		dragWidth: 700,
		widths: [375],
	},
	menu: {
		trigger: '.explore-trigger',
		overlay: '.menu-panel',
		trap: '.menu-panel',
		input: null,
		link: '.menu-category',
		scroller: null,
		dialog: false,
		widths: [1280],
	},
}

const KEYS = {
	Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
	Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
	Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
	ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
	ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
	K: { key: 'k', code: 'KeyK', keyCode: 75 },
}

const ALT = 1
const CTRL = 2
const META = 4
const SHIFT = 8

const MODIFIER_LABELS = [
	[META, 'Cmd'],
	[CTRL, 'Ctrl'],
	[ALT, 'Alt'],
	[SHIFT, 'Shift'],
]

const keyLabel = (name, modifiers) =>
	[...MODIFIER_LABELS.filter(([bit]) => modifiers & bit).map(([, label]) => label), name].join(
		'+',
	)

const [, , target = 'search', baseUrl = 'http://localhost:3000'] = process.argv
const config = OVERLAYS[target]
if (!config) {
	console.error(`知らない対象: ${target}（${Object.keys(OVERLAYS).join(' / ')}）`)
	process.exit(2)
}

const covering = config.covering ? OVERLAYS[config.covering] : null

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const findChromium = () => {
	const found = CHROMIUM_CANDIDATES.find((path) => path && existsSync(path))
	if (!found) throw new Error('Chromium が見つからない。CHROMIUM_PATH で渡す')
	return found
}

const launch = async () => {
	const profile = mkdtempSync(join(tmpdir(), 'overlay-probe-'))
	const browser = spawn(
		findChromium(),
		[
			'--headless=new',
			'--disable-gpu',
			'--no-sandbox',
			'--hide-scrollbars',
			'--no-first-run',
			'--disable-background-networking',
			'--disable-component-update',
			'--disable-sync',
			`--remote-debugging-port=${DEBUG_PORT}`,
			`--user-data-dir=${profile}`,
			'about:blank',
		],
		{ stdio: 'ignore' },
	)

	for (let i = 0; i < 100; i++) {
		try {
			const pages = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((r) =>
				r.json(),
			)
			const page = pages.find((p) => p.type === 'page')
			if (page) return { browser, profile, wsUrl: page.webSocketDebuggerUrl }
		} catch {}
		await sleep(100)
	}
	throw new Error('Chromium の CDP に繋がらない')
}

const connect = (wsUrl) =>
	new Promise((resolve, reject) => {
		const socket = new WebSocket(wsUrl)
		const pending = new Map()
		let nextId = 0

		socket.addEventListener('message', (event) => {
			const message = JSON.parse(event.data)
			const waiting = pending.get(message.id)
			if (!waiting) return

			pending.delete(message.id)
			if (message.error) waiting.reject(new Error(JSON.stringify(message.error)))
			else waiting.resolve(message.result)
		})
		socket.addEventListener('error', reject)
		socket.addEventListener('open', () =>
			resolve({
				send: (method, params = {}) =>
					new Promise((res, rej) => {
						const id = ++nextId
						pending.set(id, { resolve: res, reject: rej })
						socket.send(JSON.stringify({ id, method, params }))
					}),
				close: () => socket.close(),
			}),
		)
	})

const PAGE_HELPERS = `
	const TRIGGER = ${JSON.stringify(config.trigger)}
	const OVERLAY = ${JSON.stringify(config.overlay)}
	const TRAP = ${JSON.stringify(config.trap)}
	const INPUT = ${JSON.stringify(config.input)}
	const FIELD = ${JSON.stringify(config.field ?? null)}
	const LINK = ${JSON.stringify(config.link)}
	const COVER = ${JSON.stringify(covering?.overlay ?? null)}
	const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
	const $shown = (el) => !!el && el.getClientRects().length > 0
	const $vis = (sel) => [...document.querySelectorAll(sel)].find($shown) ?? null
	const $name = (el) => {
		if (!el || el === document.body) return el ? 'BODY' : 'null'
		const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ')
		return el.tagName + (label ? \` "\${label.slice(0, 24)}"\` : '') + ($shown(el) ? '' : ' (見えない)')
	}
	const $ring = (el) => {
		if (!el || el === document.body) return ${JSON.stringify(NO_RING)}
		const style = getComputedStyle(el)
		if (style.outlineStyle === 'none' || parseFloat(style.outlineWidth) === 0)
			return ${JSON.stringify(NO_RING)}
		return style.outlineStyle + ' ' + style.outlineWidth
	}
	const $state = () => ({
		overlay: getComputedStyle(document.querySelector(OVERLAY)).visibility,
		overflow: getComputedStyle(document.body).overflow,
		active: $name(document.activeElement),
		activeShown: $shown(document.activeElement) && document.activeElement !== document.body,
		ring: $ring(document.activeElement),
		underline: FIELD ? getComputedStyle(document.querySelector(FIELD)).borderBottomColor : null,
		path: $path(),
		query: INPUT ? (document.querySelector(INPUT)?.value ?? null) : null,
		width: Math.round(document.querySelector(TRAP).getBoundingClientRect().width),
	})
	const $router = () => document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$router
	const $path = () => $router()?.currentRoute?.value?.path ?? location.pathname
	const $line = () => {
		const active = document.querySelector(LINK + '.is-active')
		return active ? getComputedStyle(active).borderLeftColor : ${JSON.stringify(NO_ACTIVE)}
	}
	const $frames = (n) => new Promise((done) => {
		const step = () => (n-- > 0 ? requestAnimationFrame(step) : done())
		step()
	})
	const $settled = async (sel) => {
		let last = ''
		for (let i = 0; i < 60; i++) {
			await $frames(1)
			const now = JSON.stringify(document.querySelector(sel)?.getBoundingClientRect())
			if (now === last) return true
			last = now
		}
		return false
	}
`

const start = async () => {
	const { browser, profile, wsUrl } = await launch()
	const cdp = await connect(wsUrl)
	await cdp.send('Page.enable')
	await cdp.send('Runtime.enable')

	const evaluate = async (body) => {
		const result = await cdp.send('Runtime.evaluate', {
			expression: `(async () => {${PAGE_HELPERS}\n${body}\n})()`,
			awaitPromise: true,
			returnByValue: true,
		})
		if (result.exceptionDetails) {
			throw new Error(result.exceptionDetails.exception?.description ?? 'ページ側で失敗した')
		}
		return result.result.value
	}

	const setWidth = (width, height = 900) =>
		cdp.send('Emulation.setDeviceMetricsOverride', {
			width,
			height,
			deviceScaleFactor: 1,
			mobile: false,
		})

	const setTouch = (enabled) =>
		cdp.send('Emulation.setTouchEmulationEnabled', { enabled, maxTouchPoints: 5 })

	const tap = async (selector, label) => {
		sent(`${label}をタップ`)
		const point = await centerOf(selector)
		const at = [{ x: Math.round(point.x), y: Math.round(point.y) }]
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at })
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await evaluate('await $frames(3)')
	}

	const touchDrag = async (point, dy, label) => {
		sent(label)
		const at = (offset) => [{ x: Math.round(point.x), y: Math.round(point.y - offset) }]
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) })
		for (let step = 1; step <= 8; step++) {
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: at((dy * step) / 8),
			})
			await sleep(16)
		}
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
		await evaluate('await $frames(3)')
	}

	const watchTouchMoves = () =>
		evaluate(`
			window.__touchMoves = []
			document.addEventListener('touchmove', (event) => {
				window.__touchMoves.push({
					prevented: event.defaultPrevented,
					cancelable: event.cancelable,
					target: $name(event.target),
				})
			})
		`)

	const overlayPoint = () =>
		evaluate(`
			const overlay = document.querySelector(OVERLAY)
			const box = overlay.getBoundingClientRect()
			const x = box.left + box.width / 2
			for (let y = box.bottom - 8; y > box.top; y -= 8) {
				if (document.elementFromPoint(x, y) === overlay) return { x, y }
			}
			throw new Error('被せた側の素の部分が見つからない')
		`)

	const waitFor = async (body, timeout = OPEN_TIMEOUT) => {
		for (let waited = 0; waited < timeout; waited += 50) {
			if (await evaluate(`return ${body}`)) return true
			await sleep(50)
		}
		return false
	}

	const reload = async () => {
		await cdp.send('Page.navigate', { url: `${baseUrl}/` })
		await waitFor(`document.readyState === 'complete'`, 30000)
		await waitFor(`!!document.querySelector('#__nuxt')?.__vue_app__`, 30000)
		await waitFor(`!!document.querySelector(TRIGGER)?.__vueParentComponent`, 3000)
		await evaluate('await $frames(2)')
	}

	const pressKey = async (name, modifiers = 0) => {
		sent(keyLabel(name, modifiers))
		const { key, code, keyCode } = KEYS[name]
		const base = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode }
		await cdp.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown', modifiers })
		await cdp.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp', modifiers })
	}

	const typeKeys = async (text) => {
		sent(`"${text}" をキーで打つ`)
		for (const char of text) {
			const code = `Key${char.toUpperCase()}`
			const keyCode = char.toUpperCase().charCodeAt(0)
			const base = {
				key: char,
				code,
				windowsVirtualKeyCode: keyCode,
				nativeVirtualKeyCode: keyCode,
			}
			await cdp.send('Input.dispatchKeyEvent', { ...base, type: 'keyDown', text: char })
			await cdp.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' })
		}
		await evaluate('await $frames(2)')
	}

	const pressShortcut = async (modifiers) => {
		await evaluate(`
			window.__shortcutEvent = null
			if (!window.__shortcutHooked) {
				window.__shortcutHooked = true
				window.addEventListener('keydown', (event) => {
					window.__shortcutEvent = event
				})
			}
		`)
		await pressKey(config.shortcut, modifiers)
		await evaluate('await $frames(2)')
		return evaluate(`
			const event = window.__shortcutEvent
			return event ? { key: event.key, prevented: event.defaultPrevented } : null
		`)
	}

	const mouse = async (type, { x, y }, buttons) =>
		cdp.send('Input.dispatchMouseEvent', {
			type,
			x,
			y,
			button: 'left',
			buttons,
			clickCount: 1,
		})

	const centerOf = (selector) =>
		evaluate(`
			const el = $vis(${JSON.stringify(selector)})
			if (!el) throw new Error('見えている要素が無い: ' + ${JSON.stringify(selector)})
			const box = el.getBoundingClientRect()
			return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
		`)

	const click = async (selector, label) => {
		sent(`${label}を実クリック`)
		let blocked = null
		for (let waited = 0; waited < 2000; waited += 50) {
			const point = await centerOf(selector)
			blocked = await evaluate(`
				const el = $vis(${JSON.stringify(selector)})
				const at = document.elementFromPoint(${point.x}, ${point.y})
				return el.contains(at) ? null : $name(at)
			`)
			if (!blocked) {
				await mouse('mousePressed', point, 1)
				await mouse('mouseReleased', point, 0)
				return point
			}
			await sleep(50)
		}
		throw new Error(`押した位置にあるのは ${selector} ではなく ${blocked}`)
	}

	const openByShortcut = async (modifiers) => {
		let key = null
		for (let attempt = 0; attempt < 8; attempt++) {
			key = await pressShortcut(modifiers)
			const opened = await waitFor(
				`getComputedStyle(document.querySelector(OVERLAY)).visibility === 'visible'`,
				1000,
			)
			if (opened) {
				await evaluate('return $settled(TRAP)')
				return { key, opened: true }
			}
		}
		return { key, opened: false }
	}

	const openCover = async () => {
		for (let attempt = 0; attempt < 8; attempt++) {
			await click(covering.trigger, '下の層のトリガ')
			const opened = await waitFor(
				`getComputedStyle(document.querySelector(COVER)).visibility === 'visible'`,
				1000,
			)
			if (opened) {
				await evaluate(`return $settled(${JSON.stringify(covering?.trap ?? null)})`)
				return
			}
		}
		throw new Error('下の層が開かない')
	}

	const open = async ({ synthetic = false, touch = false } = {}) => {
		for (let attempt = 0; attempt < 8; attempt++) {
			if (synthetic) {
				sent('トリガに合成 click（フォーカスを動かさない）')
				await evaluate(
					`$vis(TRIGGER).dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
				)
			} else if (touch) {
				await tap(config.trigger, 'トリガ')
			} else {
				await click(config.trigger, 'トリガ')
			}

			const opened = await waitFor(
				`getComputedStyle(document.querySelector(OVERLAY)).visibility === 'visible'`,
				1000,
			)
			if (opened) {
				await evaluate('return $settled(TRAP)')
				const stayed = await evaluate(
					`return getComputedStyle(document.querySelector(OVERLAY)).visibility === 'visible'`,
				)
				if (stayed) return
			}
		}
		throw new Error('被せた UI が開かない')
	}

	const compose = async (text) => {
		sent('imeSetComposition で変換中にする')
		await cdp.send('Input.imeSetComposition', {
			text,
			selectionStart: text.length,
			selectionEnd: text.length,
		})
	}

	const waitClosed = () =>
		waitFor(`getComputedStyle(document.querySelector(OVERLAY)).visibility === 'hidden'`, 2500)

	const warm = async () => {
		await reload()
		const article = await evaluate(
			`return document.querySelector('a[href^="/article/"]')?.getAttribute('href') ?? null`,
		)
		if (article) {
			await cdp.send('Page.navigate', { url: `${baseUrl}${article}` })
			await waitFor(`document.readyState === 'complete'`, 30000)
		}
	}

	const typeQuery = async () => {
		for (const query of ['a', 'vim', 'e', 'i']) {
			await evaluate(`
				const input = document.querySelector(INPUT)
				input.focus()
				if (input.value !== '') {
					input.value = ''
					input.dispatchEvent(new Event('input', { bubbles: true }))
				}
			`)
			await cdp.send('Input.insertText', { text: query })
			await evaluate('await $frames(2)')
			if (await evaluate(`return !!$vis(LINK)`)) {
				sent(`語を打つ（"${query}"）`)
				return query
			}
			await evaluate(`
				const input = document.querySelector(INPUT)
				input.value = ''
				input.dispatchEvent(new Event('input', { bubbles: true }))
			`)
		}
		throw new Error('結果の出る語が見つからない')
	}

	const reveal = async () => {
		if (config.input) await typeQuery()
		if (config.expand) {
			await click(config.expand, '折りたたみ')
			if (!(await waitFor(`getComputedStyle($vis(LINK)).visibility === 'visible'`))) {
				throw new Error('折りたたみが開かない')
			}
			await sleep(TRANSITION)
			await evaluate('return $settled(LINK)')
		}
	}

	return {
		cdp,
		browser,
		profile,
		evaluate,
		setWidth,
		setTouch,
		touchDrag,
		watchTouchMoves,
		overlayPoint,
		waitFor,
		waitClosed,
		reload,
		pressKey,
		typeKeys,
		pressShortcut,
		openByShortcut,
		openCover,
		mouse,
		centerOf,
		click,
		open,
		warm,
		compose,
		typeQuery,
		reveal,
	}
}

const sentSteps = []
const sent = (step) => {
	const last = sentSteps.at(-1)
	if (last?.step === step) last.count += 1
	else sentSteps.push({ step, count: 1 })
}
const sentLine = () =>
	sentSteps.map(({ step, count }) => (count > 1 ? `${step} ×${count}` : step)).join(' → ')

const results = []
const record = (width, name, observed, ok) => {
	results.push({ width, name, sent: sentLine(), observed, ok })
	console.log(`[${width}] ${ok ? 'OK' : 'NG'} ${name}`)
}

const show = (state, keys) =>
	keys
		.map((key) => `${key}=${typeof state[key] === 'string' ? `"${state[key]}"` : state[key]}`)
		.join(' ')

const probes = [
	{
		name: 'escape-outside',
		dialog: true,
		run: async (p) => {
			await p.open()
			sent('activeElement を blur')
			await p.evaluate(`document.activeElement?.blur()`)
			await p.pressKey('Escape')
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'overflow', 'active']),
				ok: state.overlay === 'hidden',
			}
		},
	},
	{
		name: 'scroll-lock-開いている間は背後が止まる',
		dialog: true,
		run: async (p) => {
			await p.open()
			const open = await p.evaluate('return $state()')
			await p.pressKey('Escape')
			await p.waitClosed()
			const closed = await p.evaluate('return $state()')
			return {
				observed: `開="${open.overflow}" 閉="${closed.overflow}"`,
				ok: open.overflow === 'hidden' && closed.overflow !== 'hidden',
			}
		},
	},
	{
		name: 'focus-return/実クリック',
		dialog: true,
		run: async (p) => {
			await p.open()
			await p.pressKey('Escape')
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'active', 'activeShown']),
				ok: state.overlay === 'hidden' && state.activeShown,
			}
		},
	},
	{
		name: 'focus-return/合成クリック',
		dialog: true,
		run: async (p) => {
			await p.open({ synthetic: true })
			await p.pressKey('Escape')
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'active', 'activeShown']),
				ok: state.overlay === 'hidden' && state.activeShown,
			}
		},
	},
	{
		name: 'shortcut-Cmd+K で開く',
		shortcut: true,
		run: async (p) => {
			sent('activeElement を blur')
			await p.evaluate(`document.activeElement?.blur()`)
			const { key, opened } = await p.openByShortcut(META)
			const state = await p.evaluate(`
				return {
					...$state(),
					inInput: document.activeElement === document.querySelector(INPUT),
				}
			`)
			return {
				observed: `${show(state, ['overlay', 'active'])} prevented=${key?.prevented}`,
				ok: opened && state.inInput && key?.prevented === true,
			}
		},
	},
	{
		name: 'shortcut-Ctrl+K で開く',
		shortcut: true,
		run: async (p) => {
			sent('activeElement を blur')
			await p.evaluate(`document.activeElement?.blur()`)
			const { key, opened } = await p.openByShortcut(CTRL)
			const state = await p.evaluate(`
				return {
					...$state(),
					inInput: document.activeElement === document.querySelector(INPUT),
				}
			`)
			return {
				observed: `${show(state, ['overlay', 'active'])} prevented=${key?.prevented}`,
				ok: opened && state.inInput && key?.prevented === true,
			}
		},
	},
	{
		name: 'shortcut-開いている間の Cmd+K',
		shortcut: true,
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			const key = await p.pressShortcut(META)
			await p.waitClosed()
			await sleep(TRANSITION)
			const state = await p.evaluate(`
				return { ...$state(), onTrigger: document.activeElement === $vis(TRIGGER) }
			`)
			return {
				observed: `${show(state, ['overlay', 'active', 'activeShown'])} トリガに戻った=${state.onTrigger} prevented=${key?.prevented}`,
				ok:
					state.overlay === 'hidden' &&
					state.activeShown &&
					state.onTrigger &&
					key?.prevented === true,
			}
		},
	},
	{
		name: 'shortcut-変換中の Ctrl+K',
		shortcut: true,
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			await p.compose('あ')
			const composing = await p.evaluate('return $state()')
			const key = await p.pressShortcut(CTRL)
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return {
				observed: `${show(state, ['overlay', 'query'])} prevented=${key?.prevented}`,
				ok:
					state.overlay === 'visible' &&
					state.query === composing.query &&
					key?.prevented === false,
			}
		},
	},
	{
		name: 'shortcut-ドロワーを開いたまま',
		covering: true,
		widths: [375],
		run: async (p) => {
			await p.openCover()

			const { opened } = await p.openByShortcut(META)
			if (!opened) throw new Error('ショートカットで開かない')

			await p.pressKey('Escape')
			await p.waitClosed()
			const state = await p.evaluate(`
				const active = document.activeElement
				const box = active.getBoundingClientRect()
				const at = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
				return {
					...$state(),
					cover: getComputedStyle(document.querySelector(COVER)).visibility,
					covered: !active.contains(at) && active !== at,
					at: $name(at),
				}
			`)
			return {
				observed: `${show(state, ['overlay', 'active', 'activeShown'])} 下の層="${state.cover}" 戻し先の位置に居るのは ${state.at}`,
				ok:
					state.overlay === 'hidden' &&
					state.activeShown &&
					!state.covered &&
					state.cover === 'hidden',
			}
		},
	},
	{
		name: 'shortcut-ドロワーを開いたまま md を跨いだ Cmd+K',
		covering: true,
		shortcut: true,
		widths: [375],
		run: async (p) => {
			await p.openCover()
			sent('幅を 1280 に広げる')
			await p.setWidth(1280)
			await p.evaluate('await $frames(3)')
			const key = await p.pressShortcut(META)
			await sleep(TRANSITION)
			const state = await p.evaluate(`
				return {
					...$state(),
					cover: getComputedStyle(document.querySelector(COVER)).visibility,
					inInput: document.activeElement === document.querySelector(INPUT),
				}
			`)
			await p.setWidth(375)
			return {
				observed: `${show(state, ['overlay', 'active'])} ドロワー="${state.cover}" prevented=${key?.prevented}`,
				ok:
					state.cover === 'hidden' &&
					state.overlay === 'visible' &&
					state.inInput &&
					key?.prevented === true,
			}
		},
	},
	{
		name: 'focus-return/ショートカット',
		shortcut: true,
		run: async (p) => {
			sent('activeElement を blur')
			await p.evaluate(`document.activeElement?.blur()`)
			const { opened } = await p.openByShortcut(META)
			if (!opened) throw new Error('ショートカットで開かない')

			await p.pressKey('Escape')
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'active', 'activeShown']),
				ok: state.overlay === 'hidden' && state.activeShown,
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開く',
		input: true,
		run: async (p) => {
			await p.open()
			const state = await p.evaluate(`
				return {
					...$state(),
					inInput: document.activeElement === document.querySelector(INPUT),
				}
			`)
			return {
				observed: show(state, ['active', 'activeShown', 'ring']),
				ok: state.inInput && state.ring === NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/タップで開く',
		input: true,
		widths: [375],
		run: async (p) => {
			await p.setTouch(true)
			await p.reload()
			await p.setWidth(375)
			await p.open({ touch: true })
			const state = await p.evaluate(`
				return {
					...$state(),
					inInput: document.activeElement === document.querySelector(INPUT),
				}
			`)
			return {
				observed: show(state, ['overlay', 'active', 'activeShown', 'ring']),
				ok: state.inInput && state.ring === NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/ショートカットで開く',
		shortcut: true,
		run: async (p) => {
			const before = await p.evaluate('return $state()')
			const { opened } = await p.openByShortcut(META)
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['active', 'activeShown', 'ring', 'underline']),
				ok:
					opened &&
					state.activeShown &&
					state.ring === NO_RING &&
					state.underline !== before.underline,
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開いてから Tab',
		dialog: true,
		run: async (p) => {
			await p.open()
			await p.reveal()
			await p.pressKey('Tab')
			await p.evaluate('await $frames(2)')
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['active', 'activeShown', 'ring']),
				ok: state.activeShown && state.ring !== NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開いてキーで打つ',
		input: true,
		run: async (p) => {
			await p.open()
			await p.typeKeys('a')
			const state = await p.evaluate(`
				return {
					...$state(),
					inInput: document.activeElement === document.querySelector(INPUT),
				}
			`)
			return {
				observed: show(state, ['active', 'query', 'ring']),
				ok: state.inInput && state.ring === NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/キーで打った後に素の部分を実クリックで戻る',
		restoresOnOutsideClick: true,
		run: async (p) => {
			await p.open()
			await p.typeKeys('a')
			const point = await p.overlayPoint()
			sent('被せた側の素の部分を実クリック')
			await p.mouse('mousePressed', point, 1)
			await p.mouse('mouseReleased', point, 0)
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'active', 'ring']),
				ok: state.overlay === 'hidden' && state.activeShown && state.ring === NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開き語を打たずに Tab',
		input: true,
		run: async (p) => {
			const before = await p.evaluate('return $state()')
			await p.open()
			await p.pressKey('Tab')
			await p.evaluate('await $frames(2)')
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['active', 'activeShown', 'ring', 'underline']),
				ok:
					state.activeShown &&
					(state.ring !== NO_RING || state.underline !== before.underline),
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開き Tab で出て Shift+Tab で戻る',
		input: true,
		run: async (p) => {
			const before = await p.evaluate('return $state()')
			await p.open()
			await p.reveal()
			await p.pressKey('Tab')
			await p.pressKey('Tab', SHIFT)
			await p.evaluate('await $frames(2)')
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['active', 'activeShown', 'ring', 'underline']),
				ok:
					state.activeShown &&
					state.active.startsWith('INPUT') &&
					state.ring === NO_RING &&
					state.underline !== before.underline,
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開き Escape で戻る',
		dialog: true,
		run: async (p) => {
			await p.open()
			await p.reveal()
			await p.pressKey('Tab')
			await p.pressKey('Escape')
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'active', 'ring']),
				ok: state.overlay === 'hidden' && state.activeShown && state.ring !== NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/幅を跨いだ戻し先に目印を残さない',
		restoresOnOutsideClick: true,
		widths: [375],
		run: async (p) => {
			await p.open()
			sent('幅を 1280 に広げる')
			await p.setWidth(1280)
			await p.evaluate('await $frames(2)')
			const point = await p.overlayPoint()
			sent('被せた側の素の部分を実クリック')
			await p.mouse('mousePressed', point, 1)
			await p.mouse('mouseReleased', point, 0)
			await p.waitClosed()
			sent('幅を 375 に戻す')
			await p.setWidth(375)
			await p.evaluate('await $frames(2)')
			await p.pressKey('Tab')
			const seen = await p.evaluate(`
				const el = $vis(TRIGGER)
				el.focus()
				return { name: $name(el), ring: $ring(el) }
			`)
			return {
				observed: `戻し先=${seen.name} ring="${seen.ring}"`,
				ok: seen.ring !== NO_RING,
			}
		},
	},
	{
		name: 'focus-ring/実クリックで開き素の部分を実クリックで戻る',
		restoresOnOutsideClick: true,
		run: async (p) => {
			await p.open()
			await p.reveal()
			await p.pressKey('Tab')
			const point = await p.overlayPoint()
			sent('被せた側の素の部分を実クリック')
			await p.mouse('mousePressed', point, 1)
			await p.mouse('mouseReleased', point, 0)
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'active', 'ring']),
				ok: state.overlay === 'hidden' && state.activeShown && state.ring === NO_RING,
			}
		},
	},
	{
		name: 'aria-被せている間の背面と名前',
		dialog: true,
		run: async (p) => {
			await p.open()
			const observed = await p.evaluate(`
				const trap = document.querySelector(TRAP)
				const reachable = [...document.querySelectorAll(FOCUSABLE)].filter(
					(el) =>
						$shown(el) &&
						getComputedStyle(el).visibility !== 'hidden' &&
						!trap.contains(el) &&
						!el.closest('[inert], [aria-hidden="true"]'),
				)
				return {
					name: trap.getAttribute('aria-label'),
					modal: trap.getAttribute('aria-modal'),
					role: trap.getAttribute('role'),
					expanded: $vis(TRIGGER)?.getAttribute('aria-expanded') ?? null,
					reachable: reachable.map($name),
				}
			`)
			const left = observed.reachable
			return {
				observed: `名前="${observed.name}" role="${observed.role}" aria-modal="${observed.modal}" トリガの aria-expanded="${observed.expanded}" 背面に残った行き先=${left.length}件${left.length > 0 ? `（${left.slice(0, 5).join(' / ')}${left.length > 5 ? ' …' : ''}）` : ''}`,
				ok:
					left.length === 0 &&
					!!observed.name &&
					observed.role === 'dialog' &&
					observed.modal === 'true' &&
					observed.expanded === 'true',
			}
		},
	},
	{
		name: 'tab-cycle',
		dialog: true,
		run: async (p) => {
			await p.open()
			if (config.input) await p.typeQuery()
			const destinations = await p.evaluate(`
				const root = document.querySelector(TRAP)
				return [...root.querySelectorAll(FOCUSABLE)].filter(
					(el) => getComputedStyle(el).visibility !== 'hidden' && $shown(el),
				).length
			`)
			const landings = []
			for (let i = 0; i < 10; i++) {
				await p.pressKey('Tab', i < 8 ? 0 : SHIFT)
				landings.push(
					await p.evaluate(`
						const active = document.activeElement
						return {
							name: $name(active),
							shown: $shown(active) && active !== document.body,
							inside: !!document.querySelector(TRAP)?.contains(active),
						}
					`),
				)
			}
			const stuck = landings.filter((landing) => !landing.shown)
			const outside = landings.filter((landing) => !landing.inside)
			const moved = new Set(landings.map((landing) => landing.name)).size > 1
			return {
				observed: `行き先=${destinations}件 ${landings.map((l) => `${l.name}${l.inside ? '' : '(外)'}`).join(' → ')}`,
				ok: stuck.length === 0 && outside.length === 0 && (destinations < 2 || moved),
			}
		},
	},
	{
		name: 'tab-md-cross',
		dialog: true,
		widths: [375],
		run: async (p) => {
			await p.open()
			if (config.input) await p.typeQuery()
			sent('幅を 1280 に広げる')
			await p.setWidth(1280)
			await p.evaluate('await $frames(3)')
			const trapShown = await p.evaluate(`return $shown(document.querySelector(TRAP))`)
			const landings = []
			for (let i = 0; i < 7; i++) {
				await p.pressKey('Tab', i < 5 ? 0 : SHIFT)
				landings.push(
					await p.evaluate(`
						const active = document.activeElement
						return {
							name: $name(active),
							shown: $shown(active) && active !== document.body,
							inside: !!document.querySelector(TRAP)?.contains(active),
						}
					`),
				)
			}
			await p.setWidth(375)
			const moved = new Set(landings.map((landing) => landing.name)).size > 1
			const misplaced = landings.filter((landing) => landing.inside !== trapShown)
			return {
				observed: `被せた側=${trapShown ? '出たまま' : '消える'} 行き先: ${landings
					.map((l) => `${l.name}${l.inside ? '' : '(外)'}`)
					.join(' → ')}`,
				ok: moved && misplaced.length === 0 && landings.every((landing) => landing.shown),
			}
		},
	},
	{
		name: 'tab-開き際のフレーム',
		dialog: true,
		run: async (p) => {
			let samples = []
			for (
				let attempt = 0;
				attempt < 8 && !samples.some((sample) => sample.open);
				attempt++
			) {
				const stillOpen = await p.evaluate(
					`return getComputedStyle(document.querySelector(OVERLAY)).visibility === 'visible'`,
				)
				if (stillOpen) {
					await p.pressKey('Escape')
					if (!(await p.waitClosed())) throw new Error('開いたまま閉じられない')
				}

				sent('トリガに合成 click（フォーカスを動かさない）')
				sent('同じフレームから6フレーム、各フレームで Tab（cancelable）')
				samples = await p.evaluate(`
					$vis(TRIGGER).dispatchEvent(new MouseEvent('click', { bubbles: true }))
					const samples = []
					for (let frame = 0; frame < 6; frame++) {
						await Promise.resolve()
						const root = document.querySelector(TRAP)
						const destinations = [...root.querySelectorAll(FOCUSABLE)].filter(
							(el) => getComputedStyle(el).visibility !== 'hidden' && $shown(el),
						).length
						const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
						window.dispatchEvent(event)
						samples.push({
							frame,
							open: document.querySelector(OVERLAY).classList.contains('is-open'),
							destinations,
							prevented: event.defaultPrevented,
						})
						await $frames(1)
					}
					return samples
				`)
			}
			return {
				observed: samples
					.map(
						(s) =>
							`f${s.frame}=${s.open ? '開' : '閉'}/行き先${s.destinations}件/prevent=${s.prevented}`,
					)
					.join(' '),
				ok:
					samples.some((sample) => sample.open) &&
					!samples.some((sample) => sample.destinations === 0 && sample.prevented),
			}
		},
	},
	{
		name: 'history-back',
		run: async (p) => {
			const cycle = async () => {
				await p.open()
				await p.reveal()
				const from = await p.evaluate(`return $path()`)
				await p.evaluate(`window.__overlayProbe = 1`)
				await p.click(config.link, '中のリンク')
				if (!(await p.waitFor(`$path() !== ${JSON.stringify(from)}`))) {
					throw new Error('リンクで遷移しない')
				}
				await sleep(TRANSITION)
				await p.open()
				sent('history.back()')
				await p.evaluate(`history.back()`)
				if (!(await p.waitFor(`$path() === ${JSON.stringify(from)}`))) {
					throw new Error('history.back() で戻らない')
				}
				await p.waitClosed()
				return p.evaluate('return { ...$state(), same: !!window.__overlayProbe }')
			}

			for (let attempt = 0; attempt < 3; attempt++) {
				await cycle()
				await p.reload()
				sentSteps.length = 0
				sent('（下ごしらえ）遷移と戻るを1往復')

				const state = await cycle()
				if (!state.same) {
					await p.reload()
					continue
				}
				return {
					observed: show(state, ['overlay', 'overflow', 'path']),
					ok: state.overlay === 'hidden' && state.overflow !== 'hidden',
				}
			}
			throw new Error('同じ文書に戻らない（フルロードになる）')
		},
	},
	{
		name: 'pointer-入力欄から外へドラッグ',
		input: true,
		run: async (p) => {
			await p.open()
			const query = await p.typeQuery()
			const inside = await p.centerOf(config.input)
			const outside = { x: 5, y: 5 }
			sent('入力欄で mousedown → 外に move → 外で mouseup')
			await p.mouse('mousePressed', inside, 1)
			await p.mouse('mouseMoved', outside, 1)
			await p.mouse('mouseReleased', outside, 0)
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'query']),
				ok: state.overlay === 'visible' && state.query === query,
			}
		},
	},
	{
		name: 'ime-変換中の Escape',
		input: true,
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			await p.compose('あ')
			await p.pressKey('Escape')
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return { observed: show(state, ['overlay']), ok: state.overlay === 'visible' }
		},
	},
	{
		name: 'ime-変換中の Enter',
		input: true,
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			const from = await p.evaluate(`return $path()`)
			await p.compose('あ')
			await p.pressKey('Enter')
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'path']),
				ok: state.overlay === 'visible' && state.path === from,
			}
		},
	},
	{
		name: 'ime-確定が先に届く順序（Safari）',
		input: true,
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			sent('compositionstart / compositionend → isComposing=false の Enter と Escape')
			const observed = await p.evaluate(`
				const input = document.querySelector(INPUT)
				const from = $path()
				const fire = (key) => {
					input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
					input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'あ' }))
					input.dispatchEvent(
						new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: false }),
					)
				}
				fire('Enter')
				await $frames(2)
				const afterEnter = $state()
				fire('Escape')
				await $frames(2)
				const afterEscape = $state()
				return { from, enter: afterEnter, escape: afterEscape }
			`)
			await sleep(TRANSITION)
			return {
				observed: `確定 Enter: overlay="${observed.enter.overlay}" path="${observed.enter.path}" / 取り消し Escape: overlay="${observed.escape.overlay}"`,
				ok:
					observed.enter.overlay === 'visible' &&
					observed.enter.path === observed.from &&
					observed.escape.overlay === 'visible',
			}
		},
	},
	{
		name: 'ime-変換が切れて続く',
		input: true,
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			sent('compositionstart → 同じフレームで end + start → 2フレーム後に確定の Enter')
			const observed = await p.evaluate(`
				const input = document.querySelector(INPUT)
				const from = $path()
				const composition = (type, data) =>
					input.dispatchEvent(new CompositionEvent(type, { bubbles: true, data }))
				composition('compositionstart')
				composition('compositionend', 'あ')
				composition('compositionstart')
				await $frames(2)
				composition('compositionend', 'い')
				input.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: false }),
				)
				await $frames(2)
				return { from, after: $state() }
			`)
			await sleep(TRANSITION)
			return {
				observed: show(observed.after, ['overlay', 'path']),
				ok: observed.after.overlay === 'visible' && observed.after.path === observed.from,
			}
		},
	},
	{
		name: 'touch-被せた側の素の部分をドラッグ',
		dialog: true,
		scroller: true,
		widths: [375],
		run: async (p) => {
			const width = config.dragWidth ?? 375
			await p.setWidth(width)
			await p.setTouch(true)
			await p.reload()
			await p.setWidth(width)
			const offset = await p.evaluate(`
				return Math.floor((document.documentElement.scrollHeight - window.innerHeight) / 2)
			`)
			sent(`背後のページを ${offset}px 下げる`)
			const room = await p.evaluate(`
				window.scrollTo(0, ${offset})
				await $frames(2)
				return document.documentElement.scrollHeight - window.innerHeight - window.scrollY
			`)
			if (room <= 0) throw new Error('背後のページに下がる余地が無い')
			await p.open()
			await p.reveal()
			await p.watchTouchMoves()
			const before = await p.evaluate(`return window.scrollY`)
			await p.touchDrag(await p.overlayPoint(), 240, '素の部分で押して上に240pxドラッグ')
			const observed = await p.evaluate(`
				return { moves: window.__touchMoves, scrollY: window.scrollY, ...$state() }
			`)
			const cancelable = observed.moves.filter((move) => move.cancelable)
			return {
				width,
				observed: `残りの余地=${room}px touchmove=${observed.moves.length}件（cancelable=${cancelable.length}件）うち止めた=${cancelable.filter((m) => m.prevented).length}件 scrollY=${before}→${observed.scrollY} overlay="${observed.overlay}"`,
				ok:
					cancelable.length > 0 &&
					cancelable.every((move) => move.prevented) &&
					observed.scrollY === before &&
					observed.overlay === 'visible',
			}
		},
	},
	{
		name: 'touch-中のスクローラをドラッグ',
		dialog: true,
		scroller: true,
		widths: [375],
		run: async (p) => {
			await p.setWidth(375, 420)
			await p.setTouch(true)
			await p.reload()
			await p.setWidth(375, 420)
			await p.open()
			await p.reveal()
			const room = await p.evaluate(`
				const el = $vis(${JSON.stringify(config.scroller)})
				if (!el) throw new Error('スクローラが見えていない')
				return el.scrollHeight - el.clientHeight
			`)
			if (room <= 0) throw new Error('中身があふれていない（送っても動く余地が無い）')

			await p.watchTouchMoves()
			await p.touchDrag(
				await p.centerOf(config.scroller),
				120,
				'スクローラの上で押して上に120pxドラッグ',
			)
			const observed = await p.evaluate(`
				return {
					moves: window.__touchMoves,
					scrollTop: $vis(${JSON.stringify(config.scroller)}).scrollTop,
					scrollY: window.scrollY,
				}
			`)
			const prevented = observed.moves.filter((move) => move.cancelable && move.prevented)
			return {
				observed: `あふれ=${room}px touchmove=${observed.moves.length}件 うち止めた=${prevented.length}件 scrollTop=${observed.scrollTop} scrollY=${observed.scrollY}`,
				ok: prevented.length === 0 && observed.scrollTop > 0 && observed.scrollY === 0,
			}
		},
	},
	{
		name: 'touch-指2本（ピンチ）',
		dialog: true,
		scroller: true,
		widths: [375],
		run: async (p) => {
			await p.open()
			sent('素の部分に指1本と指2本の touchmove を送る')
			const observed = await p.evaluate(`
				const overlay = document.querySelector(OVERLAY)
				const fire = (count) => {
					const touches = Array.from(
						{ length: count },
						() => new Touch({ identifier: 0, target: overlay }),
					)
					const event = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches })
					overlay.dispatchEvent(event)
					return event.defaultPrevented
				}
				return { one: fire(1), two: fire(2) }
			`)
			return {
				observed: `指1本=${observed.one ? '止めた' : '通した'} 指2本=${observed.two ? '止めた' : '通した'}`,
				ok: observed.one === true && observed.two === false,
			}
		},
	},
	{
		name: '変換していない ↓ と Enter',
		input: true,
		widths: [1280],
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			const from = await p.evaluate(`return $path()`)
			await p.pressKey('ArrowDown')
			await p.evaluate('await $frames(2)')
			const line = await p.evaluate('return $line()')
			await p.pressKey('Enter')
			const moved = await p.waitFor(`$path() !== ${JSON.stringify(from)}`)
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return {
				observed: `${show(state, ['overlay', 'path'])} 縦線="${line}"`,
				ok:
					moved &&
					state.overlay === 'hidden' &&
					line !== TRANSPARENT &&
					line !== NO_ACTIVE,
			}
		},
	},
	{
		name: '↑↓ の案内の無い幅の ↓ と Enter',
		input: true,
		widths: [375],
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			const from = await p.evaluate(`return $path()`)
			await p.pressKey('ArrowDown')
			await p.evaluate('await $frames(2)')
			const line = await p.evaluate('return $line()')
			await p.pressKey('Enter')
			const moved = await p.waitFor(`$path() !== ${JSON.stringify(from)}`)
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return {
				observed: `${show(state, ['overlay', 'path'])} 縦線="${line}"`,
				ok: moved && state.overlay === 'hidden' && line === TRANSPARENT,
			}
		},
	},
	{
		name: 'shortcut-ダイアログを開いたまま md を跨いだ Cmd+K',
		shortcut: true,
		dialog: true,
		widths: [375],
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			sent('幅を 1280 に広げる')
			await p.setWidth(1280)
			await p.evaluate('await $frames(3)')
			const key = await p.pressShortcut(META)
			await sleep(TRANSITION)
			const state = await p.evaluate(`
				return { ...$state(), onTrigger: document.activeElement === $vis(TRIGGER) }
			`)
			await p.setWidth(375)
			return {
				observed: `${show(state, ['overlay', 'active', 'activeShown'])} トリガに戻った=${state.onTrigger} prevented=${key?.prevented}`,
				ok:
					state.overlay === 'hidden' &&
					state.activeShown &&
					state.onTrigger &&
					key?.prevented === true,
			}
		},
	},
	{
		name: 'キー-↓↑ でスクローラが選択を追う',
		input: true,
		scroller: true,
		widths: [1280],
		run: async (p) => {
			await p.setWidth(1280, 420)
			await p.reload()
			await p.setWidth(1280, 420)
			await p.open()
			await p.typeQuery()

			const rows = await p.evaluate(`
				const el = $vis(${JSON.stringify(config.scroller)})
				if (!el) throw new Error('スクローラが見えていない')
				if (el.scrollHeight <= el.clientHeight) throw new Error('中身があふれていない（送っても動く余地が無い）')
				return el.children.length
			`)

			const seen = `
				const el = $vis(${JSON.stringify(config.scroller)})
				const active = el.querySelector(LINK + '.is-active')
				if (!active) return { scrollTop: el.scrollTop, shown: false }
				const box = el.getBoundingClientRect()
				const row = active.getBoundingClientRect()
				return {
					scrollTop: el.scrollTop,
					shown: row.top >= box.top - 1 && row.bottom <= box.bottom + 1,
				}
			`

			for (let i = 0; i < rows - 1; i++) await p.pressKey('ArrowDown')
			await p.evaluate('await $frames(2)')
			const last = await p.evaluate(seen)

			for (let i = 0; i < rows - 1; i++) await p.pressKey('ArrowUp')
			await p.evaluate('await $frames(2)')
			const first = await p.evaluate(seen)

			return {
				observed: `行=${rows}件 末尾で scrollTop=${last.scrollTop}/見えている=${last.shown} 先頭で scrollTop=${first.scrollTop}/見えている=${first.shown}`,
				ok: last.shown && first.shown && last.scrollTop > first.scrollTop,
			}
		},
	},
]

const main = async () => {
	const probe = await start()
	let failed = 0

	try {
		await probe.warm()
		for (const width of config.widths) {
			await probe.setWidth(width)
			for (const item of probes) {
				if (item.input && !config.input) continue
				if (item.shortcut && !config.shortcut) continue
				if (item.covering && !covering) continue
				if (item.scroller && !config.scroller) continue
				if (item.dialog && !config.dialog) continue
				if (item.restoresOnOutsideClick && !config.restoresOnOutsideClick) continue
				if (item.widths && !item.widths.includes(width)) continue

				await probe.setTouch(false)
				await probe.reload()
				await probe.setWidth(width)
				sentSteps.length = 0
				try {
					const { observed, ok, width: sent = width } = await item.run(probe)
					record(sent, item.name, observed, ok)
					if (ok === false) failed++
				} catch (error) {
					record(width, item.name, `送れなかった: ${error.message}`, false)
					failed++
				}
			}
		}
	} finally {
		probe.cdp.close()
		probe.browser.kill()
		await sleep(200)
		try {
			rmSync(probe.profile, { recursive: true, force: true })
		} catch {}
	}

	mkdirSync('.verify', { recursive: true })
	const lines = [
		`# overlay-probe ${target} — ${baseUrl} — ${new Date().toISOString()}`,
		`# 送った操作: ${results.length}件（幅 ${config.widths.join(' / ')}）`,
		'',
		...results.flatMap((result) => [
			`[${result.width}] ${result.ok ? 'OK' : 'NG'} ${result.name}`,
			`  送信: ${result.sent}`,
			`  観測: ${result.observed}`,
		]),
		'',
		`NG ${failed}件 / OK ${results.length - failed}件`,
	]
	writeFileSync(`.verify/overlay-${target}.log`, `${lines.join('\n')}\n`)

	console.log(
		`\nNG ${failed}件 / OK ${results.length - failed}件 → .verify/overlay-${target}.log`,
	)
	process.exit(failed > 0 ? 1 : 0)
}

if (process.argv[1]?.endsWith('overlay-probe.mjs')) await main()
