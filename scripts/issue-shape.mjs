import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { read } from './stdin.mjs'

export const FORMS = '.github/ISSUE_TEMPLATE'
// config.yml はフォームではなく、選ぶ画面の設定
const FORM = /^(?!config\.ya?ml$).+\.ya?ml$/

const CHECKLIST = /^\s*-\s+\[ \]/
const LENGTH = /本文(\d+)行以内/
const PER_SECTION = /1節(\d+)項目以内/
const ONE_LINE = /1項目1行/
const NO_PREFIX = /接頭辞は付けない/

const HEADING = /^#{2,3}\s+(\S.*?)\s*$/
const ITEM = /^\s*[-*]\s+/
const CHECKED = /^\s*[-*]\s+\[[ xX]\]\s+/
// 分類の接頭辞として実際に付く綴り。`fix:` `feat(ui):` `[bug]`
const PREFIX = /^(?:\[[^\]]+\]|[A-Za-z][\w .-]*(?:\([^)]*\))?\s*[:：])/

export const load = (root = fileURLToPath(new URL('..', import.meta.url))) => {
	const dir = join(root, FORMS)
	return readdirSync(dir)
		.filter((name) => FORM.test(name))
		.sort()
		.map((name) => parse(readFileSync(join(dir, name), 'utf8')))
}

// フォームは種別を1つ選んで書くので、種別のラベルもフォームごとに1つ
const form = ({ labels, body }) => {
	const fields = Array.isArray(body) ? body : []
	const inputs = fields.filter(({ type }) => type !== 'markdown')
	const prose = fields
		.map(({ attributes }) => [attributes?.value, attributes?.description].join('\n'))
		.join('\n')
	const checklist = inputs.find(({ attributes }) => CHECKLIST.test(attributes?.value ?? ''))
	return {
		kind: [labels].flat().filter((label) => typeof label === 'string')[0],
		sections: inputs.map(({ attributes, validations }) => ({
			name: attributes?.label,
			required: validations?.required === true,
			checklist: attributes === checklist?.attributes,
		})),
		length: Number(LENGTH.exec(prose)?.[1]),
		items: Number(PER_SECTION.exec(prose)?.[1]),
		oneLine: ONE_LINE.test(prose),
		unprefixed: NO_PREFIX.test(prose),
	}
}

export const rules = (forms) => (Array.isArray(forms) ? forms : []).map(form)

export const complete = (it) =>
	it.length > 0 &&
	it.every(
		(each) =>
			typeof each.kind === 'string' &&
			each.sections.some(({ required }) => required) &&
			each.sections.some(({ checklist }) => checklist) &&
			[each.length, each.items].every(Number.isFinite),
	)

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

// 種別以外のラベルは問わない。付けるかは書き手が決める
const labelled = (labels, forms) => {
	const all = forms.map(({ kind }) => kind)
	const kinds = labels.filter((label) => all.includes(label))
	if (kinds.length === 1) return []
	const now = kinds.length === 0 ? '今はなし' : `今は ${kinds.join(' / ')}`
	return [`ラベルは ${all.join(' / ')} から1つ（${now}）`]
}

// 種別のラベルが決まらないときも、本文は先頭のフォームで見る。理由を1度に出し切る
export const findings = ({ title, body, labels }, forms) => {
	const names = list(labels)
	const it = forms.find(({ kind }) => names.includes(kind)) ?? forms[0]
	return [
		...(it.unprefixed && PREFIX.test(text(title))
			? ['タイトルに分類の接頭辞が付いている']
			: []),
		...labelled(names, forms),
		...shaped(text(body), it),
	]
}

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

	let it = []
	try {
		it = rules(load())
	} catch {}
	if (!complete(it)) {
		console.error(`型を ${FORMS}/ から読めない`)
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
