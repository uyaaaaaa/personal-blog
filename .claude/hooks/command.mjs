// Bash の綴りのうち、引用とヒアドキュメントの本文をコマンドとして読まないための共通部分。
const TOKEN =
	/\d*(?:>>|<<-?|[<>])&?\d*|&&|\|\||[;|&\n(){}]|(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^\s;|&\n(){}"']+)+/g
const HEREDOC = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/g
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
const LAUNCHER = new Set(['env', 'command', 'exec', 'builtin', 'nohup', 'time'])
const LAUNCHER_VALUED = new Set(['-u', '--unset', '-C', '--chdir', '-a', '-f', '-o'])

// env -S は値そのものをコマンドとして割って起こす
const SPLIT = /^(?:-S|--split-string)(?:=([\s\S]*))?$/

export const SEPARATOR = new Set(['&&', '||', ';', '|', '&', '\n', '(', ')', '{', '}'])
export const REDIRECT = /^\d*[<>]+/

export const unquote = (token) =>
	token.replace(/^"([\s\S]*)"$/, '$1').replace(/^'([\s\S]*)'$/, '$1')

const withoutHeredocs = (command) => {
	const kept = []
	const ends = []
	for (const line of command.split('\n')) {
		if (ends.length > 0) {
			if (line.trim() === ends[0]) ends.shift()
			continue
		}
		kept.push(line)
		for (const [, , tag] of line.matchAll(HEREDOC)) ends.push(tag)
	}
	return kept.join('\n')
}

export const tokens = (command) =>
	[...withoutHeredocs(command).matchAll(TOKEN)].map(([token]) => token)

// 先頭の代入と、後ろのコマンドをそのまま起こす語を読み飛ばし、その名前で呼ばれているときだけ引数ごと返す
export const invoked = (found, name) => {
	const base = (token) => token?.replace(/^.*\//, '')
	let at = 0
	let launched = false
	while (at < found.length) {
		if (ASSIGNMENT.test(found[at])) at += 1
		else if (LAUNCHER.has(base(found[at]))) {
			launched = true
			at += 1
		} else if (launched && SPLIT.test(found[at])) {
			const [, attached] = SPLIT.exec(found[at])
			const rest = found.slice(at + (attached === undefined ? 2 : 1))
			return invoked([...tokens(attached ?? found[at + 1] ?? '').map(unquote), ...rest], name)
		} else if (launched && found[at].startsWith('-')) {
			at += LAUNCHER_VALUED.has(found[at]) ? 2 : 1
		} else break
	}
	return base(found[at]) === name ? found.slice(at) : null
}
