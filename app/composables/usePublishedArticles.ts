// キーは記事をまたいで共有されるので、引数で絞り込む形にしない。絞り込むと、最初に
// 生成したページの結果がプリレンダした全ページに出る
export const usePublishedArticles = () =>
	useAsyncData(
		'published-articles',
		() =>
			queryCollection('article')
				.where('published', '=', true)
				.order('date', 'DESC')
				.select('path', 'title', 'date', 'tags', 'category')
				.all(),
		{ default: () => [] },
	)
