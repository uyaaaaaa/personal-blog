import { randomBytes } from 'node:crypto'

const MODEL = 'claude-opus-5'
const SOURCE_URL = 'https://github.com/uyaaaaaa/personal-blog'
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

const USAGE = [
	'使い方:',
	'  node scripts/session-args.mjs issue <番号>',
	'  node scripts/session-args.mjs review <PR番号>',
	'  node scripts/session-args.mjs task <スラッグ> <プロンプト>',
	'',
	'出力の JSON をそのまま create_session に渡す。',
]

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const suffix = () => [...randomBytes(6)].map((byte) => ALPHABET[byte % ALPHABET.length]).join('')

const issue = (rest) => {
	const [number, ...extra] = rest
	if (!/^[1-9][0-9]*$/.test(number ?? '') || extra.length > 0) {
		fail('issue に渡すのは番号1つだけ。', '', ...USAGE)
	}
	return {
		title: `issue #${number}`,
		branch: `claude/issue-${number}-${suffix()}`,
		body: `assign スキルに従って #${number} を進める。`,
	}
}

const review = (rest) => {
	const [number, ...extra] = rest
	if (!/^[1-9][0-9]*$/.test(number ?? '') || extra.length > 0) {
		fail('review に渡すのは PR の番号1つだけ。', '', ...USAGE)
	}
	return {
		title: `PR #${number}`,
		body: `review スキルの「見届けを頼まれたとき」に従って ${SOURCE_URL}/pull/${number} を見る。`,
	}
}

const task = (rest) => {
	const [slug, ...body] = rest
	if (!SLUG.test(slug ?? '')) {
		fail('スラッグは英小文字・数字・ハイフンで書く。', '', ...USAGE)
	}
	if (slug.startsWith('issue-')) {
		fail('issue- で始まるスラッグは、issue のブランチと見分けが付かない。')
	}
	if (body.join('').trim() === '') {
		fail('プロンプトが空。', '', ...USAGE)
	}
	return {
		title: slug,
		branch: `claude/${slug}-${suffix()}`,
		body: body.join('\n'),
	}
}

const [kind, ...rest] = process.argv.slice(2)
const build = { issue, review, task }[kind]
if (!build) fail(...USAGE)

const { title, branch, body } = build(rest)
const prompt = [
	body,
	...(branch ? [`作業ブランチは ${branch} にする。`] : []),
	'答えを待てる相手はいないので、判断は自分で決めて進める。',
].join('\n')

console.log(JSON.stringify({ model: MODEL, source_url: SOURCE_URL, title, prompt }, null, 2))
