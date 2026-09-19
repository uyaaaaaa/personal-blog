import { parseFrontMatter } from 'remark-mdc'
import { LineCounter, parseDocument } from 'yaml'

// remark-mdc が閉じと見るのは行頭の `---` で、その後ろの綴りも改行の種類も問わない。
// 閉じの位置から先を落とせば、開きの `---`（document の開始そのもの）だけが残り、
// 次の document の開始と読まれずに、行番号がファイルと揃う
const CLOSING = '\n---'

// 切った跡に残る CRLF の `\r` は、yaml には最後の値の後ろに続く字に見える
const CR = /\r$/

// remark-mdc は壊れた YAML を復元した値として返し、yaml が挙げた errors を捨てる。
// 復元された値はスキーマを通るので、同じ範囲をもう一度読んで errors を見る
export const readFrontMatter = (body: string): Record<string, unknown> => {
	const { content, data } = parseFrontMatter(body)
	const block = body.slice(0, body.length - content.length)

	const lineCounter = new LineCounter()
	const source = block.slice(0, block.lastIndexOf(CLOSING)).replace(CR, '')
	const [error] = parseDocument(source, { prettyErrors: false, lineCounter }).errors
	if (error) throw new Error(`${lineCounter.linePos(error.pos[0]).line}行目: ${error.message}`)

	return data
}
