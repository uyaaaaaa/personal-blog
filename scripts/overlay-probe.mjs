// 被せた UI（ダイアログ・ドロワー）に操作を送り、送った操作と観測を .verify/ に残す。
// npm run dev を起こしてから: node scripts/overlay-probe.mjs search [URL]

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
const OPEN_TIMEOUT = 4000
const TRANSITION = 400

// 被せた UI と、そこに送る操作の当て先。増えたらここに足す
const OVERLAYS = {
	search: {
		trigger: 'header button[aria-haspopup="dialog"]',
		overlay: '.search-overlay',
		trap: '.search-dialog',
		input: '.search-input',
		link: '.search-result',
		widths: [375, 1280],
	},
	drawer: {
		trigger: '.mobile-menu-btn',
		overlay: '.mobile-menu-overlay',
		trap: '.mobile-drawer',
		input: null,
		// 折りたたみの中のリンクしか他のページに行かないので、開いてから押す
		expand: 'button[aria-controls="drawer-group-latest"]',
		link: '#drawer-group-latest a',
		widths: [375],
	},
}

const KEYS = {
	Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
	Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
	Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
	ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
	ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
}

const [, , target = 'search', baseUrl = 'http://localhost:3000'] = process.argv
const config = OVERLAYS[target]
if (!config) {
	console.error(`知らない対象: ${target}（${Object.keys(OVERLAYS).join(' / ')}）`)
	process.exit(2)
}

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
		} catch {
			// まだ待ち受けていない
		}
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

// ページ側で使う道具。$vis は同じセレクタで幅ごとに出ている方を選ぶ
const PAGE_HELPERS = `
	const TRIGGER = ${JSON.stringify(config.trigger)}
	const OVERLAY = ${JSON.stringify(config.overlay)}
	const TRAP = ${JSON.stringify(config.trap)}
	const INPUT = ${JSON.stringify(config.input)}
	const LINK = ${JSON.stringify(config.link)}
	const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
	const $shown = (el) => !!el && el.getClientRects().length > 0
	const $vis = (sel) => [...document.querySelectorAll(sel)].find($shown) ?? null
	const $name = (el) => {
		if (!el || el === document.body) return el ? 'BODY' : 'null'
		const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ')
		return el.tagName + (label ? \` "\${label.slice(0, 24)}"\` : '') + ($shown(el) ? '' : ' (見えない)')
	}
	const $state = () => ({
		overlay: getComputedStyle(document.querySelector(OVERLAY)).visibility,
		overflow: document.body.style.overflow,
		active: $name(document.activeElement),
		activeShown: $shown(document.activeElement) && document.activeElement !== document.body,
		path: $path(),
		query: INPUT ? (document.querySelector(INPUT)?.value ?? null) : null,
	})
	const $router = () => document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$router
	// URL は popstate で先に変わる。閉じる側が見ているのはルータが移り終えた後の route
	const $path = () => $router()?.currentRoute?.value?.path ?? location.pathname
	const $frames = (n) => new Promise((done) => {
		const step = () => (n-- > 0 ? requestAnimationFrame(step) : done())
		step()
	})
	// 滑り込みの途中で座標を取ると、押した先が別の要素になる
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

	const setWidth = (width) =>
		cdp.send('Emulation.setDeviceMetricsOverride', {
			width,
			height: 900,
			deviceScaleFactor: 1,
			mobile: false,
		})

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
		// ハイドレーションが済むまでクリックが効かない
		await waitFor(`!!document.querySelector('#__nuxt')?.__vue_app__`, 30000)
		await evaluate('await $frames(2)')
	}

	const pressKey = async (name, modifiers = 0) => {
		const { key, code, keyCode } = KEYS[name]
		const base = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode }
		await cdp.send('Input.dispatchKeyEvent', { ...base, type: 'rawKeyDown', modifiers })
		await cdp.send('Input.dispatchKeyEvent', { ...base, type: 'keyUp', modifiers })
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

	// 開き際は座標だけ先に決まって、そこに見えているのは別の要素という状態がある
	const click = async (selector) => {
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

	// synthetic は click でフォーカスを動かさないブラウザ（Safari / Firefox）と同じ状況を作る。
	// ハイドレーションの前に押しても何も起きないので、開くまで同じ押し方で押し直す
	const open = async ({ synthetic = false } = {}) => {
		for (let attempt = 0; attempt < 8; attempt++) {
			if (synthetic) {
				await evaluate(
					`$vis(TRIGGER).dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
				)
			} else {
				await click(config.trigger)
			}

			const opened = await waitFor(
				`getComputedStyle(document.querySelector(OVERLAY)).visibility === 'visible'`,
				1000,
			)
			if (opened) {
				await evaluate('return $settled(TRAP)')
				return
			}
		}
		throw new Error('被せた UI が開かない')
	}

	// 閉じるアニメーションの分だけ待つ。閉じないものは待っても閉じない
	const waitClosed = () =>
		waitFor(`getComputedStyle(document.querySelector(OVERLAY)).visibility === 'hidden'`, 1500)

	// 結果が出ないと Enter もリンクも測れないので、当たる語を探して打つ
	const typeQuery = async () => {
		for (const query of ['a', 'vim', 'e', 'i']) {
			await evaluate(`document.querySelector(INPUT).focus()`)
			await cdp.send('Input.insertText', { text: query })
			await evaluate('await $frames(2)')
			if (await evaluate(`return !!$vis(LINK)`)) return query
			await evaluate(`
				const input = document.querySelector(INPUT)
				input.value = ''
				input.dispatchEvent(new Event('input', { bubbles: true }))
			`)
		}
		throw new Error('結果の出る語が見つからない')
	}

	return {
		cdp,
		browser,
		profile,
		evaluate,
		setWidth,
		waitFor,
		waitClosed,
		reload,
		pressKey,
		mouse,
		centerOf,
		click,
		open,
		typeQuery,
	}
}

const results = []
const record = (width, name, sent, observed, ok) => {
	results.push({ width, name, sent, observed, ok })
	console.log(`[${width}] ${ok ? 'OK' : 'NG'} ${name}`)
}

const show = (state, keys) =>
	keys
		.map((key) => `${key}=${typeof state[key] === 'string' ? `"${state[key]}"` : state[key]}`)
		.join(' ')

const probes = [
	{
		name: 'escape-outside',
		sent: 'トリガを実クリック → activeElement を blur → Escape',
		run: async (p) => {
			await p.open()
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
		name: 'focus-return/実クリック',
		sent: 'トリガを実クリック → Escape',
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
		sent: 'トリガに合成 click（フォーカスを動かさない） → Escape',
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
		name: 'tab-cycle',
		sent: 'トリガを実クリック → 語を打つ → Tab ×8 → Shift+Tab ×2',
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
				await p.pressKey('Tab', i < 8 ? 0 : 8)
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
			const moved = new Set(landings.map((landing) => landing.name)).size > 1
			return {
				observed: `行き先=${destinations}件 ${landings.map((l) => `${l.name}${l.inside ? '' : '(外)'}`).join(' → ')}`,
				ok: stuck.length === 0 && (destinations < 2 || moved),
			}
		},
	},
	{
		name: 'tab-md-cross',
		widths: [375],
		sent: '375 で開く → 語を打つ → 1280 に広げる → Tab ×5 → Shift+Tab ×2',
		run: async (p) => {
			await p.open()
			if (config.input) await p.typeQuery()
			await p.setWidth(1280)
			await p.evaluate('await $frames(3)')
			const landings = []
			for (let i = 0; i < 7; i++) {
				await p.pressKey('Tab', i < 5 ? 0 : 8)
				landings.push(await p.evaluate(`return $name(document.activeElement)`))
			}
			await p.setWidth(375)
			const moved = new Set(landings).size > 1 && !landings.every((name) => name === 'BODY')
			return { observed: `行き先: ${landings.join(' → ')}`, ok: moved }
		},
	},
	{
		name: 'tab-開き際のフレーム',
		sent: '合成 click で開く → 開いた同じフレームから6フレーム、各フレームで Tab（cancelable）',
		run: async (p) => {
			const samples = await p.evaluate(`
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
			return {
				observed: samples
					.map(
						(s) =>
							`f${s.frame}=${s.open ? '開' : '閉'}/行き先${s.destinations}件/prevent=${s.prevented}`,
					)
					.join(' '),
				// 行き先が0件のまま握りつぶすと、Tab はどこにも進まない
				ok: !samples.some((sample) => sample.destinations === 0 && sample.prevented),
			}
		},
	},
	{
		name: 'history-back',
		sent: '開く → 中のリンクを実クリックで遷移 → もう一度開く → history.back()',
		run: async (p) => {
			await p.open()
			if (config.input) await p.typeQuery()
			if (config.expand) {
				await p.click(config.expand)
				await p.waitFor(`getComputedStyle($vis(LINK)).visibility === 'visible'`)
				await p.evaluate('return $settled(LINK)')
			}
			const from = await p.evaluate(`return $path()`)
			await p.click(config.link)
			if (!(await p.waitFor(`$path() !== ${JSON.stringify(from)}`))) {
				throw new Error('リンクで遷移しない')
			}
			await sleep(TRANSITION)
			await p.open()
			await p.evaluate(`history.back()`)
			await p.waitFor(`$path() === ${JSON.stringify(from)}`)
			await p.waitClosed()
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'overflow', 'path']),
				ok: state.overlay === 'hidden' && state.overflow === '',
			}
		},
	},
	{
		name: 'pointer-入力欄から外へドラッグ',
		input: true,
		sent: '開く → 語を打つ → 入力欄で mousedown → 外に move → 外で mouseup',
		run: async (p) => {
			await p.open()
			const query = await p.typeQuery()
			const inside = await p.centerOf(config.input)
			const outside = { x: 5, y: 5 }
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
		sent: '開く → 語を打つ → imeSetComposition で変換中にする → Escape',
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			await p.cdp.send('Input.imeSetComposition', {
				text: 'あ',
				selectionStart: 1,
				selectionEnd: 1,
			})
			await p.pressKey('Escape')
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return { observed: show(state, ['overlay']), ok: state.overlay === 'visible' }
		},
	},
	{
		name: 'ime-変換中の Enter',
		input: true,
		sent: '開く → 語を打つ → imeSetComposition で変換中にする → Enter',
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			const from = await p.evaluate(`return $path()`)
			await p.cdp.send('Input.imeSetComposition', {
				text: 'あ',
				selectionStart: 1,
				selectionEnd: 1,
			})
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
		sent: '開く → 語を打つ → compositionstart / compositionend → isComposing=false の Enter と Escape',
		run: async (p) => {
			await p.open()
			await p.typeQuery()
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
		sent: '開く → 語を打つ → compositionstart → 同じフレームで end + start → 2フレーム後に確定の Enter',
		run: async (p) => {
			await p.open()
			await p.typeQuery()
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
		name: '変換していない ↓ と Enter',
		input: true,
		sent: '開く → 語を打つ → ArrowDown → Enter',
		run: async (p) => {
			await p.open()
			await p.typeQuery()
			const from = await p.evaluate(`return $path()`)
			await p.pressKey('ArrowDown')
			await p.evaluate('await $frames(2)')
			await p.pressKey('Enter')
			const moved = await p.waitFor(`$path() !== ${JSON.stringify(from)}`)
			await sleep(TRANSITION)
			const state = await p.evaluate('return $state()')
			return {
				observed: show(state, ['overlay', 'path']),
				ok: moved && state.overlay === 'hidden',
			}
		},
	},
]

const main = async () => {
	const probe = await start()
	let failed = 0

	try {
		for (const width of config.widths) {
			await probe.setWidth(width)
			for (const item of probes) {
				if (item.input && !config.input) continue
				if (item.widths && !item.widths.includes(width)) continue

				await probe.reload()
				await probe.setWidth(width)
				try {
					const { observed, ok } = await item.run(probe)
					record(width, item.name, item.sent, observed, ok)
					if (ok === false) failed++
				} catch (error) {
					record(width, item.name, item.sent, `送れなかった: ${error.message}`, false)
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
		} catch {
			// 終わり際のブラウザが書いている。残っても次回は別の一時ディレクトリを使う
		}
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

await main()
