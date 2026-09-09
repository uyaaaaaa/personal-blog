import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REMOTE = 'origin'
const JOURNAL = 'harness/journal'
const LEDGER = 'harness/ledger'
const LEDGER_FILE = 'LEDGER.md'
const STATE_FILE = 'state.json'
const PUSH_RETRIES = 3

const USAGE = [
	'使い方:',
	'  node scripts/harness-journal.mjs append <PR番号>   # 本文は標準入力',
	'  node scripts/harness-journal.mjs pending',
	'  node scripts/harness-journal.mjs ledger',
	'  node scripts/harness-journal.mjs save <journalのSHA>  # 台帳は標準入力',
]

const fail = (...lines) => {
	for (const line of lines) console.error(line)
	process.exit(1)
}

const git = (args, options = {}) =>
	execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options })

const head = (branch) => {
	try {
		git(['fetch', '--quiet', REMOTE, `refs/heads/${branch}`])
	} catch {
		return null
	}
	return git(['rev-parse', 'FETCH_HEAD']).trim()
}

const readFile = (commit, path) => {
	try {
		return git(['cat-file', '-p', `${commit}:${path}`])
	} catch {
		return null
	}
}

const listFiles = (commit) =>
	commit === null
		? []
		: git(['ls-tree', '-r', '--name-only', commit]).trim().split('\n').filter(Boolean)

const commitFiles = (branch, parent, files, message) => {
	const index = join(tmpdir(), `harness-${randomBytes(6).toString('hex')}`)
	const env = { ...process.env, GIT_INDEX_FILE: index }
	try {
		git(['read-tree', ...(parent === null ? ['--empty'] : [parent])], { env })
		for (const [path, content] of Object.entries(files)) {
			const blob = git(['hash-object', '-w', '--stdin'], { input: content }).trim()
			git(['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`], { env })
		}
		const tree = git(['write-tree'], { env }).trim()
		const commit = git([
			'commit-tree',
			tree,
			...(parent === null ? [] : ['-p', parent]),
			'-m',
			message,
		]).trim()
		git(['push', '--quiet', REMOTE, `${commit}:refs/heads/${branch}`])
		return commit
	} finally {
		rmSync(index, { force: true })
	}
}

const push = (branch, build, message) => {
	for (let attempt = 0; ; attempt += 1) {
		const parent = head(branch)
		try {
			return commitFiles(branch, parent, build(parent), message)
		} catch (error) {
			if (attempt >= PUSH_RETRIES - 1) throw error
		}
	}
}

const stdin = () => {
	const text = readFileSync(0, 'utf8').trim()
	if (text === '') fail('本文が空。標準入力から渡す。', '', ...USAGE)
	return `${text}\n`
}

const stamp = () => {
	const now = new Date()
	const pad = (value) => String(value).padStart(2, '0')
	return {
		dir: [now.getUTCFullYear(), pad(now.getUTCMonth() + 1), pad(now.getUTCDate())].join('/'),
		time: [now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()].map(pad).join(''),
	}
}

const consumed = () => {
	const ledger = head(LEDGER)
	const state = ledger === null ? null : readFile(ledger, STATE_FILE)
	return { ledger, journal: state === null ? null : (JSON.parse(state).journal ?? null) }
}

const append = ([number, ...extra]) => {
	if (!/^[1-9][0-9]*$/.test(number ?? '') || extra.length > 0) {
		fail('append に渡すのは PR の番号1つだけ。', '', ...USAGE)
	}
	const body = stdin()
	const { dir, time } = stamp()
	const path = `${dir}/${time}-pr${number}.md`
	push(JOURNAL, () => ({ [path]: body }), `PR #${number} で受けた指摘を書き留める`)
	console.log(path)
}

const pending = (extra) => {
	if (extra.length > 0) fail('pending に引数は無い。', '', ...USAGE)
	const journal = head(JOURNAL)
	if (journal === null) return
	const seen = consumed().journal
	const already = seen === null ? [] : listFiles(seen)
	const entries = listFiles(journal).filter((path) => !already.includes(path))
	if (entries.length === 0) return
	console.log(`journal: ${journal}`)
	for (const path of entries.sort()) {
		console.log(`\n## ${path}\n`)
		console.log(readFile(journal, path).trimEnd())
	}
}

const ledger = (extra) => {
	if (extra.length > 0) fail('ledger に引数は無い。', '', ...USAGE)
	const current = consumed().ledger
	const body = current === null ? null : readFile(current, LEDGER_FILE)
	if (body !== null) process.stdout.write(body)
}

const save = ([sha, ...extra]) => {
	if (!/^[0-9a-f]{7,40}$/.test(sha ?? '') || extra.length > 0) {
		fail('save に渡すのは pending が出した journal の SHA1つだけ。', '', ...USAGE)
	}
	const body = stdin()
	push(
		LEDGER,
		() => ({
			[LEDGER_FILE]: body,
			[STATE_FILE]: `${JSON.stringify({ journal: sha }, null, 2)}\n`,
		}),
		'台帳を畳み直す',
	)
	console.log(sha)
}

const [command, ...rest] = process.argv.slice(2)
const commands = { append, pending, ledger, save }
if (!Object.hasOwn(commands, command ?? '')) fail(...USAGE)
commands[command](rest)
