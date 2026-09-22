import { dirname, relative, resolve } from 'node:path'
import { fail, inputs } from './check-io.mjs'

const { root: ROOT, read, entries, exists } = inputs(process.argv[2])
const ADR = 'docs/adr'
const INDEX = 'docs/DECISIONS.md'
const POINTS = ['検討した案', '対価', '戻す条件']
const IGNORED = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', '.verify'])

const NAME = /^(\d{2})-[a-z\d]+(?:-[a-z\d]+)*\.md$/
const HEADING = /^# (\S.*)$/
const POINT = /^- \*\*(.+?)\*\*/gm
const ROW = /^- \[(\d+) (.+)\]\(\.\/adr\/(.+?)\)$/gm
const LINK = /\]\(([^)\s]+)\)/g

const walk = (directory) =>
	entries(directory).flatMap((entry) => {
		if (IGNORED.has(entry.name)) return []
		const path = directory === '' ? entry.name : `${directory}/${entry.name}`
		return entry.isDirectory() ? walk(path) : [path]
	})

const errors = []

const listing = () =>
	entries(ADR)
		.map((entry) => entry.name)
		.sort()

const named = listing()
	.filter((name) => name.endsWith('.md'))
	.filter((name) => {
		if (NAME.test(name)) return true
		errors.push(`${ADR}/${name}: ファイル名が NN-<英語スラッグ>.md ではない`)
		return false
	})

const numbered = new Map()
for (const name of named) {
	const number = name.match(NAME)[1]
	const taken = numbered.get(number)
	if (taken === undefined) numbered.set(number, name)
	else errors.push(`${ADR}: 番号 ${number} が2つある（${taken} / ${name}）`)
}

const adrs = [...numbered.entries()]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(([number, name], at) => {
		const expected = String(at + 1).padStart(2, '0')
		if (number !== expected) {
			errors.push(`${ADR}/${name}: 番号は連番にする（${at + 1}本目なので ${expected}）`)
		}
		return { number, name, source: read(`${ADR}/${name}`) }
	})

const heading = ({ source }) => source.split('\n', 1)[0].match(HEADING)?.[1] ?? ''

for (const adr of adrs) {
	const where = `${ADR}/${adr.name}`
	if (heading(adr) === '') errors.push(`${where}: 1行目を判断を言い切る # の見出しにする`)

	const written = [...adr.source.matchAll(POINT)]
		.map(([, point]) => point)
		.filter((point) => POINTS.includes(point))
	const missing = POINTS.filter((point) => !written.includes(point))
	if (missing.length > 0) {
		errors.push(`${where}: ${missing.join(' / ')} が無い`)
	} else if (written.join() !== POINTS.join()) {
		errors.push(`${where}: 三点は ${POINTS.join(' → ')} の並びで1つずつ置く`)
	}
}

const rows = [...read(INDEX).matchAll(ROW)].map(([, number, title, file], at) => ({
	number,
	title,
	file,
	at: at + 1,
}))

const byFile = new Map()
for (const row of rows) {
	const taken = byFile.get(row.file)
	if (taken === undefined) byFile.set(row.file, row)
	else errors.push(`${INDEX}: ${row.file} の行が2つある（${taken.at}行目 / ${row.at}行目）`)
}

for (const adr of adrs) {
	const row = byFile.get(adr.name)
	if (row === undefined) {
		errors.push(`${INDEX}: ${adr.name} の行が無い`)
		continue
	}
	if (row.number !== adr.number) {
		errors.push(`${INDEX}: ${adr.name} の行の番号が ${row.number}`)
	}
	if (row.title !== heading(adr)) {
		errors.push(
			`${INDEX}: ${adr.name} の行の見出しが本文と違う（索引は ${row.title}、本文は ${heading(adr)}）`,
		)
	}
}

const known = new Set(adrs.map(({ name }) => name))
for (const row of rows) {
	if (!known.has(row.file))
		errors.push(`${INDEX}: ${row.at}行目の ${row.file} に当たる ADR が無い`)
}

const listed = [...byFile.values()].filter((row) => known.has(row.file)).map((row) => row.file)
const ordered = adrs.filter(({ name }) => byFile.has(name)).map(({ name }) => name)
const turned = listed.findIndex((file, at) => file !== ordered[at])
if (turned !== -1) {
	errors.push(`${INDEX}: 行は番号の順に並べる（${listed[turned]} が ${ordered[turned]} より先）`)
}

for (const path of walk('').filter((path) => path.endsWith('.md'))) {
	const source = read(path)
	for (const match of source.matchAll(LINK)) {
		const [, href] = match
		const [target] = href.split('#')
		if (target === '' || href.includes('://')) continue

		const to = relative(ROOT, resolve(ROOT, dirname(path), target))
		if (!to.startsWith(`${ADR}/`) || exists(to)) continue

		const line = source.slice(0, match.index).split('\n').length
		errors.push(`${path}:${line}: ${href} の先が無い`)
	}
}

if (errors.length > 0) {
	fail('ADR の番号と索引と書き方が揃っていない:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ ADRs are numbered, indexed, shaped alike and linked (${adrs.length} ADRs)`)
