import { readFileSync } from 'node:fs'
import { read } from './stdin.mjs'

const SKILL = new URL('../.claude/skills/create-issues/SKILL.md', import.meta.url)

const NEEDS = new Set(['必須', '任意'])
const CHECKLIST = 'チェックリスト'
const CRITERIA = /完了条件は(\d+)つまで/
const LENGTH = /本文(\d+)行以内/
const PER_SECTION = /1節(\d+)項目以内/
const ONE_LINE = /1項目1行/
const LABELS = /ラベルは((?:\s*`[a-z-]+`\s*\/?)+)から(\d+)つ/
const ADDED = /`([a-z-]+)` を足す/g
const NO_PREFIX = /接頭辞は付けない/
const NAMED = /`([a-z-]+)`/g

const SEPARATOR = /^\|\s*:?-{3,}/
const HEADING = /^##\s+(\S.*?)\s*$/
const ITEM = /^\s*[-*]\s+/
const CHECKED = /^\s*[-*]\s+\[[ xX]\]\s+/
// 分類の接頭辞として実際に付く綴り。`fix:` `feat(ui):` `[bug]`
const PREFIX = /^(?:\[[^\]]+\]|[A-Za-z][\w .-]*(?:\([^)]*\))?\s*[:：])/

// 表の本体は区切り行の次から読む。見出しの行を名前で外すと、節の名前を2箇所に持つ
const rows = (source) => {
	const lines = source.split('\n')
	const found = []
	for (const [at, line] of lines.entries()) {
		if (!SEPARATOR.test(line)) continue
		for (let next = at + 1; lines[next]?.startsWith('|'); next += 1) {
			found.push(
				lines[next]
					.split('|')
					.slice(1, -1)
					.map((cell) => cell.trim()),
			)
		}
	}
	return found
}

export const rules = (source) => {
	const labels = LABELS.exec(source)
	return {
		sections: rows(source)
			.filter((row) => row.length === 3 && NEEDS.has(row[2]))
			.map(([name, means, need]) => ({
				name,
				required: need === '必須',
				checklist: means.includes(CHECKLIST),
			})),
		criteria: Number(CRITERIA.exec(source)?.[1]),
		length: Number(LENGTH.exec(source)?.[1]),
		items: Number(PER_SECTION.exec(source)?.[1]),
		oneLine: ONE_LINE.test(source),
		kinds: labels ? [...labels[1].matchAll(NAMED)].map(([, name]) => name) : [],
		kindCount: Number(labels?.[2]),
		extras: [...source.matchAll(ADDED)].map(([, name]) => name),
		unprefixed: NO_PREFIX.test(source),
	}
}

export const complete = (it) =>
	it.sections.some(({ required }) => required) &&
	it.sections.some(({ checklist }) => checklist) &&
	it.kinds.length > 0 &&
	[it.criteria, it.length, it.items, it.kindCount].every(Number.isFinite)

const split = (lines, names) => {
	const sections = []
	let outside = 0
	for (const line of lines) {
		const heading = HEADING.exec(line)?.[1]
		if (heading === undefined) {
			if (sections.length === 0) outside += line.trim() === '' ? 0 : 1
			else sections.at(-1).lines.push(line)
			continue
		}
		sections.push({ heading, name: names.find((name) => heading.startsWith(name)), lines: [] })
	}
	return { sections, outside }
}

const ordered = (written, names) => {
	const want = names.filter((name) => written.includes(name))
	return written.every((name, at) => name === want[at])
}

const spanned = (lines) => {
	let item = false
	for (const line of lines) {
		if (line.trim() === '') item = false
		else if (ITEM.test(line)) item = true
		else if (item) return true
	}
	return false
}

const inSection = ({ name, lines }, it) => {
	const found = []
	const items = lines.filter((line) => ITEM.test(line))
	const spec = it.sections.find((section) => section.name === name)

	if (items.length > it.items) {
		found.push(`## ${name} が ${items.length} 項目（1節${it.items}項目以内）`)
	}
	if (spec.checklist) {
		if (items.length === 0 || items.some((line) => !CHECKED.test(line))) {
			found.push(`## ${name} を - [ ] のチェックリストで書く`)
		} else if (items.length > it.criteria) {
			found.push(
				`## ${name} が ${items.length} つ（${it.criteria}つまで。issue が2本に割れている）`,
			)
		}
	}
	if (it.oneLine && spanned(lines)) found.push(`## ${name} の項目が2行にまたがっている`)
	return found
}

const shaped = (body, it) => {
	const found = []
	const lines = body.replace(/\s+$/, '').split('\n')
	if (lines.length > it.length) found.push(`本文が ${lines.length} 行（${it.length}行以内）`)

	const names = it.sections.map(({ name }) => name)
	const { sections, outside } = split(lines, names)
	if (outside > 0) found.push('節の見出しの外に本文がある')

	for (const { heading, name } of sections) {
		if (name === undefined) found.push(`型に無い節: ## ${heading}`)
	}

	const written = sections.map(({ name }) => name).filter((name) => name !== undefined)
	for (const { name, required } of it.sections) {
		if (required && !written.includes(name)) found.push(`## ${name} が無い`)
	}
	for (const name of new Set(written)) {
		if (written.filter((each) => each === name).length > 1) found.push(`## ${name} が2つある`)
	}
	if (!ordered(written, names)) found.push(`節は ${names.join(' → ')} の順に並べる`)

	return [
		...found,
		...sections
			.filter(({ name }) => name !== undefined)
			.flatMap((section) => inSection(section, it)),
	]
}

const named = (label) => (typeof label === 'string' ? label : label?.name)

// GitHub は本文の無い issue に null を返す。欠けた値も空として同じ判定に通す
const text = (value) => (typeof value === 'string' ? value : '')
const list = (value) =>
	Array.isArray(value) ? value.map(named).filter((name) => typeof name === 'string') : []

const labelled = (labels, it) => {
	const found = []
	const kinds = labels.filter((label) => it.kinds.includes(label))
	if (kinds.length !== it.kindCount) {
		const now = kinds.length === 0 ? '今はなし' : `今は ${kinds.join(' / ')}`
		found.push(`ラベルは ${it.kinds.join(' / ')} から${it.kindCount}つ（${now}）`)
	}
	const rest = labels.filter((label) => !it.kinds.includes(label) && !it.extras.includes(label))
	if (rest.length > 0) found.push(`型に無いラベル: ${rest.join(' / ')}`)
	return found
}

export const findings = ({ title, body, labels }, it) => [
	...(it.unprefixed && PREFIX.test(text(title)) ? ['タイトルに分類の接頭辞が付いている'] : []),
	...labelled(list(labels), it),
	...shaped(text(body), it),
]

const main = async () => {
	let issues
	try {
		issues = JSON.parse((await read()) || 'null')
	} catch (error) {
		console.error(`issue の JSON として読めない（${error.message}）`)
		console.error('使い方: node scripts/issue-shape.mjs < issues.json')
		process.exit(1)
	}
	if (issues === null || typeof issues !== 'object') {
		console.error('issue の JSON を標準入力に渡す（1件でも配列でもよい）')
		process.exit(1)
	}

	const it = rules(readFileSync(SKILL, 'utf8'))
	if (!complete(it)) {
		console.error(`型を ${SKILL.pathname} から読めない`)
		process.exit(1)
	}

	let dropped = 0
	for (const issue of [issues].flat()) {
		const found = findings(issue, it)
		const where = `#${issue.number ?? '?'}`
		if (found.length === 0) {
			console.log(`${where} 型に合う`)
			continue
		}
		dropped += 1
		console.log(`${where} 落とす:`)
		for (const reason of found) console.log(`  ${reason}`)
	}
	process.exit(dropped === 0 ? 0 : 1)
}

if (process.argv[1]?.endsWith('issue-shape.mjs')) await main()
