#!/usr/bin/env node
// フックを有効にするのは npm install の prepare なので、install 前のセッションでは commit-msg も
// pre-commit も走らない。セッションの頭で hooksPath と依存を揃え、最初の commit から検査を通す。
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const HOOKS_PATH = '.githooks'
const INSTALL_TIMEOUT = 15 * 60 * 1000

const why = (error) =>
	String(error.stderr || error.stdout || error.message)
		.trim()
		.split('\n')
		.at(-1)

export const setup = ({ has, run }) => {
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

	return done.join('、')
}

// テストから import したときは走らせない
if (process.argv[1]?.endsWith('session-start.mjs')) {
	const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
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
		})}\n`,
	)
}
