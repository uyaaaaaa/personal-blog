import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)))
const ADR = 'docs/adr'
const INDEX = 'docs/DECISIONS.md'
const POINTS = ['検討した案', '対価', '戻す条件']

const NAME = /^(\d{2})-[a-z\d]+(?:-[a-z\d]+)*\.md$/
const HEADING = /^# (\S.*)$/
const POINT = /^- \*\*(.+?)\*\*/gm
const ROW = /^- \[(\d+) (.+)\]\(\.\/adr\/(.+?)\)$/gm

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const read = (path) => {
	try {
		return readFileSync(join(ROOT, path), 'utf8')
	} catch (error) {
		fail(`${path} を読み取れない:`, `  ${error.message}`)
	}
}

const errors = []

const listing = () => {
	try {
		return readdirSync(join(ROOT, ADR)).sort()
	} catch (error) {
		fail(`${ADR} を読み取れない:`, `  ${error.message}`)
	}
}

const named = listing().filter((name) => {
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

for (const { name, source } of adrs) {
	const where = `${ADR}/${name}`
	if (!HEADING.test(source.split('\n', 1)[0])) {
		errors.push(`${where}: 1行目を判断を言い切る # の見出しにする`)
	}

	const written = [...source.matchAll(POINT)]
		.map(([, point]) => point)
		.filter((point) => POINTS.includes(point))
	const missing = POINTS.filter((point) => !written.includes(point))
	if (missing.length > 0) {
		errors.push(`${where}: ${missing.join(' / ')} が無い`)
	} else if (written.join() !== POINTS.join()) {
		errors.push(`${where}: 三点は ${POINTS.join(' → ')} の並びで1つずつ置く`)
	}
}

const heading = ({ source }) => source.split('\n', 1)[0].match(HEADING)?.[1] ?? ''

const rows = [...read(INDEX).matchAll(ROW)].map(([, number, title, file]) => ({
	number,
	title,
	file,
}))

for (const [at, adr] of adrs.entries()) {
	const row = rows[at]
	if (row === undefined) {
		errors.push(`${INDEX}: ${adr.name} の行が無い`)
	} else if (row.file !== adr.name) {
		errors.push(`${INDEX}: ${at + 1}行目は ${row.file} を指している（${adr.name} を置く）`)
	} else if (row.number !== adr.number) {
		errors.push(`${INDEX}: ${adr.name} の行の番号が ${row.number}`)
	} else if (row.title !== heading(adr)) {
		errors.push(
			`${INDEX}: ${adr.name} の行の見出しが本文と違う（索引は ${row.title}、本文は ${heading(adr)}）`,
		)
	}
}

for (const row of rows.slice(adrs.length)) {
	errors.push(`${INDEX}: ${row.file} を指す行があるが、その ADR が無い`)
}

if (errors.length > 0) {
	fail('ADR の番号と索引と書き方が揃っていない:', ...errors.map((error) => `  ${error}`))
}

console.log(`✔ ADRs are numbered, indexed and shaped alike (${adrs.length} ADRs)`)
