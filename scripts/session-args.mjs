import { randomBytes } from 'node:crypto'

const MODEL = 'claude-opus-5-5'
const SOURCE_URL = 'https://github.com/uyaaaaaa/personal-blog'
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const LENGTH = 6
const ALONE = '答えを待てる相手はいない。'

export const SUFFIX = new RegExp(`^[${ALPHABET}]{${LENGTH}}$`)

const USAGE = [
	'使い方:',
	'  node scripts/session-args.mjs issue <番号>',
	'  node scripts/session-args.mjs task <スラッグ> <プロンプト>',
	'',
	'出力の JSON をそのまま create_session に渡す。',
]

const suffix = () =>
	[...randomBytes(LENGTH)].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')

const issue = (rest, tail) => {
	const [number, ...extra] = rest
	if (!/^[1-9][0-9]*$/.test(number ?? '') || extra.length > 0) {
		return { error: ['issue に渡すのは番号1つだけ。'] }
	}
	return {
		title: `issue #${number}`,
		branch: `claude/issue-${number}-${tail}`,
		body: `assign スキルに従って #${number} を進める。`,
	}
}

const task = (rest, tail) => {
	const [slug, ...body] = rest
	if (!SLUG.test(slug ?? '')) {
		return { error: ['スラッグは英小文字・数字・ハイフンで書く。'] }
	}
	if (slug.startsWith('issue-')) {
		return { error: ['issue- で始まるスラッグは、issue のブランチと見分けが付かない。'] }
	}
	if (body.join('').trim() === '') {
		return { error: ['プロンプトが空。'] }
	}
	return {
		title: slug,
		branch: `claude/${slug}-${tail}`,
		body: body.join('\n'),
	}
}

const builders = { issue, task }

export const KINDS = Object.keys(builders)

export const args = (kind, rest, tail = suffix()) => {
	if (!Object.hasOwn(builders, kind ?? '')) return { error: [] }

	const built = builders[kind](rest, tail)
	if (built.error) return built

	const { title, branch, body } = built
	return {
		model: MODEL,
		source_url: SOURCE_URL,
		title,
		prompt: [body, ...(branch ? [`作業ブランチは ${branch} にする。`] : []), ALONE].join('\n'),
	}
}

if (process.argv[1]?.endsWith('session-args.mjs')) {
	const [kind, ...rest] = process.argv.slice(2)
	const built = args(kind, rest)
	if (built.error) {
		for (const line of [...built.error, ...(built.error.length > 0 ? [''] : []), ...USAGE]) {
			console.error(line)
		}
		process.exit(1)
	}
	console.log(JSON.stringify(built, null, 2))
}
