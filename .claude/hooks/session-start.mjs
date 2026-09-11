#!/usr/bin/env node
// フックを有効にするのは npm install の prepare なので、install 前のセッションでは commit-msg も
// pre-commit も走らない。セッションの頭で hooksPath と依存を揃え、最初の commit から検査を通す。
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const HOOKS_PATH = '.githooks'
const INSTALL_TIMEOUT = 15 * 60 * 1000

const run = (command, args, timeout) =>
	execFileSync(command, args, {
		cwd: ROOT,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout,
	})

const why = (error) =>
	String(error.stderr || error.stdout || error.message)
		.trim()
		.split('\n')
		.at(-1)

const done = []

try {
	run('git', ['config', 'core.hooksPath', HOOKS_PATH])
	done.push(`core.hooksPath=${HOOKS_PATH}`)
} catch (error) {
	done.push(`core.hooksPath を設定できない（${why(error)}）`)
}

if (existsSync(join(ROOT, 'node_modules'))) {
	done.push('node_modules あり')
} else {
	try {
		run('npm', ['ci'], INSTALL_TIMEOUT)
		done.push('npm ci 済み')
	} catch (error) {
		done.push(`npm ci が落ち、pre-commit の lint が走らない（${why(error)}）`)
	}
}

process.stdout.write(`${done.join('、')}\n`)
