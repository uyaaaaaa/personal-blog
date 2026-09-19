import { parseFrontMatter } from 'remark-mdc'
import { LineCounter, parseDocument } from 'yaml'

// 閉じの `---` は yaml には次の document の開始に見え、どの入力でも MULTIPLE_DOCS が出る。
// 開きの `---` は document の開始そのものなので、残すと行番号がファイルと揃う
const CLOSING = /\r?\n?---\r?$/

// remark-mdc は壊れた YAML を復元した値として返し、yaml が挙げた errors を捨てる。
// 復元された値はスキーマを通るので、同じ範囲をもう一度読んで errors を見る
export const readFrontMatter = (body: string): Record<string, unknown> => {
	const { content, data } = parseFrontMatter(body)

	const lineCounter = new LineCounter()
	const source = body.slice(0, body.length - content.length).replace(CLOSING, '')
	const [error] = parseDocument(source, { prettyErrors: false, lineCounter }).errors
	if (error) throw new Error(`${lineCounter.linePos(error.pos[0]).line}行目: ${error.message}`)

	return data
}
