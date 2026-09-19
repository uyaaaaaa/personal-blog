// Bash の綴りのうち、引用とヒアドキュメントの本文をコマンドとして読まないための共通部分。
const TOKEN =
	/\d*(?:>>|<<-?|[<>])&?\d*|&&|\|\||[;|&\n(){}]|"(?:[^"\\]|\\.)*"|'[^']*'|[^\s;|&\n(){}"']+/g
const HEREDOC = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/g
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/

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

// 先頭の代入と env を読み飛ばし、その名前で呼ばれているときだけ引数ごと返す
export const invoked = (found, name) => {
	let at = 0
	while (at < found.length && (ASSIGNMENT.test(found[at]) || found[at] === 'env')) at += 1
	return found[at]?.replace(/^.*\//, '') === name ? found.slice(at) : null
}
