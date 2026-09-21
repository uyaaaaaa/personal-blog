import { fail, inputs } from './check-io.mjs'

const { read, exists, load } = inputs(process.argv[2])
const CONFIG = 'eslint.config.mjs'
const REPO_URL = 'https://github.com/uyaaaaaa/personal-blog/blob/main/'

const URL_IN_TEXT = new RegExp(`${REPO_URL}[^\\s)）」]+`, 'g')
const FENCE = /^\s*(?:```|~~~)/
const HEADING = /^#{1,6} +(\S.*?)\s*$/
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g
// GitHub の見出しアンカーの作り方。小文字にし、文字・数字・空白・ハイフン・下線以外を落とし、空白をハイフンにする
const ANCHOR_DROPPED = /[^\p{L}\p{N}\s_-]/gu

const anchorOf = (heading) =>
	heading
		.replace(MARKDOWN_LINK, '$1')
		.toLowerCase()
		.trim()
		.replace(ANCHOR_DROPPED, '')
		.replaceAll(' ', '-')

const anchorsOf = (source) => {
	const anchors = new Set()
	let fenced = false
	for (const line of source.split('\n')) {
		if (FENCE.test(line)) fenced = !fenced
		else if (!fenced) {
			const title = line.match(HEADING)?.[1]
			if (title !== undefined) anchors.add(anchorOf(title))
		}
	}
	return anchors
}

// 案内は meta.messages にも no-restricted-syntax の message にも書ける。
// どちらに綴られても拾えるよう、ESLint が読む設定そのものを歩く
const urlsIn = (config) => {
	const seen = new WeakSet()
	const urls = new Set()
	const walk = (value) => {
		if (typeof value === 'string') {
			for (const [url] of value.matchAll(URL_IN_TEXT)) urls.add(url)
		} else if (value !== null && typeof value === 'object' && !seen.has(value)) {
			seen.add(value)
			for (const each of Object.values(value)) walk(each)
		}
	}
	walk(config)
	return [...urls].sort()
}

const config = await load(CONFIG)

const urls = urlsIn(config.default)
if (urls.length === 0) {
	fail(`${CONFIG}: ${REPO_URL} を指す案内が1つも無い`, '  案内を消したならこの検査も消す')
}

const errors = []
const cached = new Map()

const anchorsIn = (path) => {
	if (!cached.has(path)) cached.set(path, anchorsOf(read(path)))
	return cached.get(path)
}

for (const url of urls) {
	const [target, fragment] = decodeURI(url.slice(REPO_URL.length)).split('#')
	if (!exists(target)) {
		errors.push(`${url}: ${target} が無い`)
		continue
	}
	if (fragment === undefined) continue

	if (!anchorsIn(target).has(fragment)) {
		errors.push(`${url}: ${target} に #${fragment} に当たる見出しが無い`)
	}
}

if (errors.length > 0) {
	fail('lint の指摘に付く案内の行き先が無い:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ every lint message links to a heading that exists (${urls.length} links)`)
