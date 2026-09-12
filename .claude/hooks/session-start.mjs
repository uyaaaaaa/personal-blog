#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const HOOKS_PATH = '.githooks'
const EVIDENCE = '.verify'
const INSTALL_TIMEOUT = 15 * 60 * 1000

// resume / compact は同じセッションの続きで、測り終えていない証跡がある
const FRESH = new Set(['startup', 'clear'])

const why = (error) =>
	String(error.stderr || error.stdout || error.message)
		.trim()
		.split('\n')
		.at(-1)

export const setup = ({ has, run, remake, source }) => {
	const done = []

	try {
		run('git', ['config', 'core.hooksPath', HOOKS_PATH])
		done.push(`core.hooksPath=${HOOKS_PATH}`)
	} catch (error) {
		done.push(`core.hooksPath を設定できない（${why(error)}）`)
	}

	if (has('node_modules')) {
		done.push('node_modules あり')
	} else {
		try {
			run('npm', ['ci'], INSTALL_TIMEOUT)
			done.push('npm ci 済み')
		} catch (error) {
			done.push(`npm ci が落ち、pre-commit の lint が走らない（${why(error)}）`)
		}
	}

	if (FRESH.has(source)) {
		try {
			remake(EVIDENCE)
			done.push(`${EVIDENCE}/ 作り直し`)
		} catch (error) {
			done.push(`${EVIDENCE}/ を作り直せない（${why(error)}）`)
		}
	}

	return done.join('、')
}

const read = async () => {
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('session-start.mjs')) {
	const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
	// source はハーネスが stdin で渡す。手で打つと読み終わらないので待たない
	let source
	if (!process.stdin.isTTY) {
		try {
			source = JSON.parse((await read()) || '{}').source
		} catch {}
	}

	process.stdout.write(
		`${setup({
			has: (path) => existsSync(join(root, path)),
			run: (command, args, timeout) =>
				execFileSync(command, args, {
					cwd: root,
					encoding: 'utf8',
					stdio: ['ignore', 'pipe', 'pipe'],
					timeout,
				}),
			remake: (path) => {
				rmSync(join(root, path), { recursive: true, force: true })
				mkdirSync(join(root, path), { recursive: true })
			},
			source,
		})}\n`,
	)
}
