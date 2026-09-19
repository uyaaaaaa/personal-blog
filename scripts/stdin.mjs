// 標準入力は 64 KiB ずつ届く。Buffer のまま連結すると、境目に来た多バイト文字が U+FFFD になる
export const read = async () => {
	// 手で打つと閉じる相手がいない。判定できない入力は黙って通す
	if (process.stdin.isTTY) return ''
	process.stdin.setEncoding('utf8')
	let buf = ''
	for await (const chunk of process.stdin) buf += chunk
	return buf
}
