// 「公開中」の判定はここだけが持つ。記事を出す取得はすべてこれを起点にする
export const publishedArticles = () => queryCollection('article').where('published', '=', true)

// 一覧（Articles / カテゴリ / タグ）が受け取る列。ここに足すと3つの一覧すべてで使える
export const publishedArticleList = () =>
	publishedArticles().order('date', 'DESC').select('path', 'title', 'date', 'tags')

// tags は JSON の配列1列。前後の " ごと照合して、名前が前方に重なる別のタグを拾わない
export const articlesTaggedWith = (tag: string) =>
	publishedArticleList().where('tags', 'LIKE', `%"${tag}"%`)
